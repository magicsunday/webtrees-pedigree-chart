<?php

/**
 * This file is part of the package magicsunday/webtrees-pedigree-chart.
 *
 * For the full copyright and license information, please read the
 * LICENSE file that was distributed with this source code.
 */

declare(strict_types=1);

namespace MagicSunday\Webtrees\PedigreeChart\Test\Facade;

use Fig\Http\Message\RequestMethodInterface;
use Fisharebest\Webtrees\Date;
use Fisharebest\Webtrees\Fact;
use Fisharebest\Webtrees\Family;
use Fisharebest\Webtrees\Http\RequestHandlers\AddParentToIndividualPage;
use Fisharebest\Webtrees\Http\RequestHandlers\AddSpouseToFamilyPage;
use Fisharebest\Webtrees\Individual;
use Fisharebest\Webtrees\Place;
use Fisharebest\Webtrees\Tree;
use GuzzleHttp\Psr7\ServerRequest;
use Illuminate\Support\Collection;
use MagicSunday\Webtrees\ModuleBase\Model\FactView;
use MagicSunday\Webtrees\ModuleBase\Model\NameSegment;
use MagicSunday\Webtrees\ModuleBase\Model\NodeData;
use MagicSunday\Webtrees\PedigreeChart\Configuration;
use MagicSunday\Webtrees\PedigreeChart\Facade\DataFacade;
use MagicSunday\Webtrees\PedigreeChart\Model\Node;
use MagicSunday\Webtrees\PedigreeChart\Module;
use MagicSunday\Webtrees\PedigreeChart\Test\Support\EnglishLocaleFixture;
use MagicSunday\Webtrees\PedigreeChart\Test\Support\ModuleSettingsFixtureTrait;
use MagicSunday\Webtrees\PedigreeChart\Test\Support\RouteFactoryFixture;
use PHPUnit\Framework\Attributes\CoversClass;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\Attributes\UsesClass;
use PHPUnit\Framework\TestCase;

use function array_filter;
use function array_map;
use function array_values;
use function json_decode;
use function json_encode;

use const JSON_THROW_ON_ERROR;

/**
 * Verifies how the data facade hands the name of an individual to the front
 * end, as ordered segments next to the flat name.
 *
 * @phpstan-type NodeFields array<string, int|bool|string|list<FactView|NameSegment|null>>
 *
 * @author  Rico Sonntag <mail@ricosonntag.de>
 * @license https://opensource.org/licenses/GPL-3.0 GNU General Public License v3.0
 * @link    https://github.com/magicsunday/webtrees-pedigree-chart/
 */
#[CoversClass(DataFacade::class)]
#[UsesClass(Configuration::class)]
#[UsesClass(Module::class)]
#[UsesClass(Node::class)]
final class DataFacadeTest extends TestCase
{
    use ModuleSettingsFixtureTrait;

    private const string STARRED_NAME
        = '<span class="NAME" dir="auto" translate="no">Anna <span class="starredname">Maria</span>'
        . ' <span class="SURN">Schmidt</span></span>';

    /**
     * The segments follow the display order of the name, and the preferred
     * given name carries the flag.
     */
    #[Test]
    public function handsOverTheNameAsOrderedSegments(): void
    {
        $payload = $this->payloadFor(self::STARRED_NAME, 'Anna Maria Schmidt', '', false);

        self::assertSame(
            [
                ['label' => 'Anna', 'kind' => 'given', 'isPreferred' => false],
                ['label' => 'Maria', 'kind' => 'given', 'isPreferred' => true],
                ['label' => 'Schmidt', 'kind' => 'surname', 'isPreferred' => false],
            ],
            $payload['nameSegments']
        );
        self::assertSame('Anna Maria Schmidt', $payload['name']);
    }

    /**
     * With the nickname option on, the quoted nickname sits behind the given
     * names, in the segments and in the flat name.
     */
    #[Test]
    public function addsTheNicknameSegmentWhenTheOptionIsOn(): void
    {
        $payload = $this->payloadFor(self::STARRED_NAME, 'Anna Maria Schmidt', 'Annie', true);

        self::assertSame(
            ['Anna', 'Maria', '"Annie"', 'Schmidt'],
            array_column($payload['nameSegments'], 'label')
        );
        self::assertSame(
            ['given', 'given', 'nickname', 'surname'],
            array_column($payload['nameSegments'], 'kind')
        );
        self::assertSame('Anna Maria "Annie" Schmidt', $payload['name']);
    }

    /**
     * With the nickname option off, the nickname stays out of the segments and
     * out of the flat name.
     */
    #[Test]
    public function leavesTheNicknameOutWhenTheOptionIsOff(): void
    {
        $payload = $this->payloadFor(self::STARRED_NAME, 'Anna Maria Schmidt', 'Annie', false);

        self::assertSame(['Anna', 'Maria', 'Schmidt'], array_column($payload['nameSegments'], 'label'));
        self::assertSame('Anna Maria Schmidt', $payload['name']);
    }

    /**
     * The payload carries the segments in place of the former name part keys.
     */
    #[Test]
    public function dropsTheFormerNamePartKeysFromThePayload(): void
    {
        $payload = $this->payloadFor(self::STARRED_NAME, 'Anna Maria Schmidt', 'Annie', true);

        foreach (['firstNames', 'lastNames', 'preferredName', 'nickname'] as $removedKey) {
            self::assertArrayNotHasKey($removedKey, $payload);
        }

        self::assertSame(
            [
                'id',
                'xref',
                'url',
                'updateUrl',
                'generation',
                'name',
                'isNameRtl',
                'nameSegments',
                'alternativeName',
                'isAltRtl',
                'thumbnail',
                'silhouette',
                'sex',
                'birth',
                'death',
                'timespan',
                'facts',
            ],
            array_keys($payload)
        );
    }

    /**
     * The payload carries one slot per row of the person box: the birth, the
     * death and one slot for every tag the tree names for the chart box. A slot
     * the person has no fact for is null, so the rows stay aligned.
     */
    #[Test]
    public function handsOverOneFactSlotPerRowAndNullForAMissingFact(): void
    {
        $birth = $this->factStub('Birth', 'Berlin, Germany', 'Berlin', '');
        $work  = $this->factStub('Occupation', '', '', 'Smith');

        $individual = $this->individual(
            self::STARRED_NAME,
            'Anna Maria Schmidt',
            '',
            factsByTag: ['BIRT' => $birth, 'OCCU' => $work],
            chartBoxTags: 'OCCU,RESI',
        );

        $node = $this->builtTree($individual, 1, false);

        /** @var array{data: array{facts: list<array<string, string>|null>}} $serialised */
        $serialised = json_decode(json_encode($node, JSON_THROW_ON_ERROR), true, 512, JSON_THROW_ON_ERROR);

        self::assertSame(
            [
                [
                    'tag'       => 'BIRT',
                    'label'     => 'Birth',
                    'date'      => '',
                    'place'     => 'Berlin',
                    'placeFull' => 'Berlin, Germany',
                    'value'     => '',
                ],
                null,
                [
                    'tag'       => 'OCCU',
                    'label'     => 'Occupation',
                    'date'      => '',
                    'place'     => '',
                    'placeFull' => '',
                    'value'     => 'Smith',
                ],
                null,
            ],
            $serialised['data']['facts']
        );
    }

    /**
     * A tree that names no tag for the chart box has the birth and the death
     * slot only.
     */
    #[Test]
    public function hasTheBirthAndDeathSlotOnlyWithoutChartBoxTags(): void
    {
        $individual = $this->individual(
            self::STARRED_NAME,
            'Anna Maria Schmidt',
            '',
            factsByTag: [],
            chartBoxTags: '',
        );

        $node = $this->builtTree($individual, 1, false);

        /** @var array{data: array{facts: list<array<string, string>|null>}} $serialised */
        $serialised = json_decode(json_encode($node, JSON_THROW_ON_ERROR), true, 512, JSON_THROW_ON_ERROR);

        self::assertSame([null, null], $serialised['data']['facts']);
    }

    /**
     * The number of generations that are built equals the configured number,
     * on the limit and one beyond it.
     *
     * @return array<string, array{int}>
     */
    public static function generationLimitProvider(): array
    {
        return [
            'two generations'   => [2],
            'three generations' => [3],
            'four generations'  => [4],
        ];
    }

    /**
     * Builds exactly the configured number of generations of a deeper pedigree.
     */
    #[Test]
    #[DataProvider('generationLimitProvider')]
    public function buildsExactlyTheConfiguredNumberOfGenerations(int $generations): void
    {
        $rows = $this->dataInTreeOrder($this->builtTree($this->pedigree(5, false), $generations, false));

        // A full pedigree in tree order, so the generation of every node is pinned.
        self::assertSame($this->generationsInTreeOrder($generations), array_column($rows, 'generation'));
    }

    /**
     * A family with one missing parent yields only the known parent.
     */
    #[Test]
    public function skipsAMissingParentWithoutAddParentLinks(): void
    {
        $father = $this->individual('Hans <span class="SURN">Schmidt</span>', 'Hans Schmidt', '', 'F1');
        $family = $this->family($father, null, false);
        $child  = $this->individual('Anna <span class="SURN">Schmidt</span>', 'Anna Schmidt', '', 'C1', $family);

        $tree = $this->builtTree($child, 3, false);

        self::assertSame(['F1'], array_column($this->dataOf($this->parentsOf($tree)), 'xref'));
    }

    /**
     * The node ids start at one and count up in tree order, the father before
     * the mother and each branch before the next one.
     */
    #[Test]
    public function numbersTheNodesInTreeOrderStartingAtOne(): void
    {
        $tree = $this->builtTree($this->pedigree(3, false), 3, false);

        self::assertSame([1, 2, 3, 4, 5, 6, 7], array_column($this->dataInTreeOrder($tree), 'id'));
        self::assertSame(
            ['I1', 'I11', 'I111', 'I112', 'I12', 'I121', 'I122'],
            array_column($this->dataInTreeOrder($tree), 'xref')
        );
    }

    /**
     * The conditions under which the add-parent placeholders are offered for a
     * person on the second generation, with each operand flipped on its own and
     * for a missing father as well as a missing mother.
     *
     * @return array<string, array{int, bool, bool, bool, bool, bool}>
     */
    public static function addParentConditionProvider(): array
    {
        $conditions = [
            'all conditions met'             => [3, true, true, true, true],
            'option off'                     => [3, false, true, true, false],
            'individual not editable'        => [3, true, false, true, false],
            'family not editable'            => [3, true, true, false, false],
            'on the generation limit'        => [2, true, true, true, false],
            'one generation below the limit' => [4, true, true, true, true],
        ];

        $cases = [];

        foreach ($conditions as $label => $condition) {
            $cases[$label . ', missing father'] = [...$condition, true];
            $cases[$label . ', missing mother'] = [...$condition, false];
        }

        return $cases;
    }

    /**
     * Offers the placeholder for a missing parent only when the option is on,
     * the generation limit is not reached and the individual and the family are
     * editable.
     */
    #[Test]
    #[DataProvider('addParentConditionProvider')]
    public function offersAddParentPlaceholdersOnlyWhenAllConditionsHold(
        int $generations,
        bool $option,
        bool $individualEditable,
        bool $familyEditable,
        bool $expected,
        bool $missingFather,
    ): void {
        $known  = $this->individual('Eva <span class="SURN">Schmidt</span>', 'Eva Schmidt', '', 'K1');
        $parent = $this->individual(
            'Hans <span class="SURN">Schmidt</span>',
            'Hans Schmidt',
            '',
            'F1',
            $this->family($missingFather ? null : $known, $missingFather ? $known : null, $familyEditable),
            $individualEditable
        );
        $partner = $this->individual('Lisa <span class="SURN">Meier</span>', 'Lisa Meier', '', 'M1');
        $child   = $this->individual(
            'Anna <span class="SURN">Schmidt</span>',
            'Anna Schmidt',
            '',
            'C1',
            $this->family($parent, $partner, false)
        );

        $tree = $this->builtTree($child, $generations, $option);

        self::assertSame(['F1', 'M1'], array_column($this->dataOf($this->parentsOf($tree)), 'xref'));

        $parentNode = $this->parentsOf($tree)[0] ?? null;

        self::assertInstanceOf(Node::class, $parentNode);

        $parents      = $this->dataOf($this->parentsOf($parentNode));
        $placeholders = $this->placeholdersOf($this->parentsOf($parentNode));
        $sex          = $missingFather ? 'M' : 'F';

        // The known parent is only built while the limit leaves room for it.
        $knownParents = $generations > 2 ? 1 : 0;

        self::assertCount($knownParents + ($expected ? 1 : 0), $parents);

        if (!$expected) {
            self::assertSame([], $placeholders);

            return;
        }

        self::assertSame([$sex], array_column($placeholders, 'sex'));
        self::assertSame([$missingFather ? 'Add a father' : 'Add a mother'], array_column($placeholders, 'name'));
        self::assertSame([-1], array_column($placeholders, 'id'));
        self::assertSame([3], array_column($placeholders, 'generation'));
        self::assertSame(
            ['/route/' . AddSpouseToFamilyPage::class . '?tree=main&xref=FAM1&sex=' . $sex],
            array_column($placeholders, 'url')
        );
    }

    /**
     * A person without a parent family gets a placeholder for each parent,
     * numbered downwards from minus one, once the conditions hold.
     */
    #[Test]
    public function offersBothPlaceholdersForAPersonWithoutParentFamily(): void
    {
        $person = $this->individual('Anna <span class="SURN">Schmidt</span>', 'Anna Schmidt', '', 'C1', null, true);

        $tree = $this->builtTree($person, 2, true);

        $placeholders = $this->dataOf($this->parentsOf($tree));

        self::assertSame(['M', 'F'], array_column($placeholders, 'sex'));
        self::assertSame([-1, -2], array_column($placeholders, 'id'));
        self::assertSame([2, 2], array_column($placeholders, 'generation'));
        self::assertSame(['Add a father', 'Add a mother'], array_column($placeholders, 'name'));
        self::assertSame(
            [
                '/route/' . AddParentToIndividualPage::class . '?tree=main&xref=C1&sex=M',
                '/route/' . AddParentToIndividualPage::class . '?tree=main&xref=C1&sex=F',
            ],
            array_column($placeholders, 'url')
        );

        self::assertSame([], $this->parentsOf($this->builtTree($person, 2, false)));
    }

    /**
     * Builds a full pedigree of the given number of levels. The xref of a
     * person extends the xref of the child with 1 for the father and 2 for the
     * mother.
     */
    private function pedigree(int $levels, bool $canEdit, string $xref = 'I1', int $level = 1): Individual
    {
        $family = null;

        if ($level < $levels) {
            $family = $this->family(
                $this->pedigree($levels, $canEdit, $xref . '1', $level + 1),
                $this->pedigree($levels, $canEdit, $xref . '2', $level + 1),
                $canEdit
            );
        }

        return $this->individual(
            'Anna <span class="SURN">Schmidt</span>',
            'Anna Schmidt',
            '',
            $xref,
            $family,
            $canEdit
        );
    }

    /**
     * Builds a parent family.
     */
    private function family(?Individual $husband, ?Individual $wife, bool $canEdit): Family
    {
        $tree = self::createStub(Tree::class);
        $tree->method('name')->willReturn('main');

        $family = self::createStub(Family::class);
        $family->method('husband')->willReturn($husband);
        $family->method('wife')->willReturn($wife);
        $family->method('canEdit')->willReturn($canEdit);
        $family->method('tree')->willReturn($tree);
        $family->method('xref')->willReturn('FAM1');

        return $family;
    }

    /**
     * Returns the generations of a full pedigree in tree order.
     *
     * @return list<int>
     */
    private function generationsInTreeOrder(int $generations, int $generation = 1): array
    {
        if ($generation >= $generations) {
            return [$generation];
        }

        return [
            $generation,
            ...$this->generationsInTreeOrder($generations, $generation + 1),
            ...$this->generationsInTreeOrder($generations, $generation + 1),
        ];
    }

    /**
     * Returns the node data in tree order, depth first and the node before its
     * parents.
     *
     * @return list<NodeFields>
     */
    private function dataInTreeOrder(Node $node): array
    {
        $flat = [$this->dataOfNode($node)];

        foreach ($this->parentsOf($node) as $parent) {
            $flat = [...$flat, ...$this->dataInTreeOrder($parent)];
        }

        return $flat;
    }

    /**
     * Returns the node data of the given nodes.
     *
     * @param list<Node> $nodes
     *
     * @return list<NodeFields>
     */
    private function dataOf(array $nodes): array
    {
        return array_map($this->dataOfNode(...), $nodes);
    }

    /**
     * Returns the data of the nodes that are add-parent placeholders.
     *
     * @param list<Node> $nodes
     *
     * @return list<NodeFields>
     */
    private function placeholdersOf(array $nodes): array
    {
        return array_values(array_filter(
            $this->dataOf($nodes),
            static fn (array $data): bool => ($data['xref'] ?? null) === ''
        ));
    }

    /**
     * Returns the serialised data of a node.
     *
     * @return NodeFields
     */
    private function dataOfNode(Node $node): array
    {
        $data = $node->jsonSerialize()['data'] ?? null;

        self::assertInstanceOf(NodeData::class, $data);

        return $data->jsonSerialize();
    }

    /**
     * Returns the parent nodes of a node.
     *
     * @return list<Node>
     */
    private function parentsOf(Node $node): array
    {
        $parents = $node->jsonSerialize()['parents'] ?? [];

        self::assertIsArray($parents);

        $nodes = [];

        foreach ($parents as $parent) {
            self::assertInstanceOf(Node::class, $parent);

            $nodes[] = $parent;
        }

        return $nodes;
    }

    /**
     * Builds the tree of one individual and returns the serialised data of its
     * root node.
     *
     * @return array{name: string, nameSegments: list<array{label: string, kind: string, isPreferred: bool}>}
     */
    private function payloadFor(string $nameHtml, string $plainName, string $nickname, bool $showNicknames): array
    {
        $node = $this->builtTree(
            $this->individual($nameHtml, $plainName, $nickname),
            1,
            false,
            $showNicknames
        );

        /** @var array{data: array{name: string, nameSegments: list<array{label: string, kind: string, isPreferred: bool}>}} $serialised */
        $serialised = json_decode(json_encode($node, JSON_THROW_ON_ERROR), true, 512, JSON_THROW_ON_ERROR);

        return $serialised['data'];
    }

    /**
     * Builds the tree of the individual with a fresh facade.
     */
    private function builtTree(
        Individual $individual,
        int $generations,
        bool $showAddParentLinks,
        bool $showNicknames = false,
    ): Node {
        RouteFactoryFixture::register();
        EnglishLocaleFixture::install();

        $module        = $this->createModuleWithPreferences([]);
        $configuration = new Configuration(
            (new ServerRequest(RequestMethodInterface::METHOD_GET, '/'))->withQueryParams([
                'generations'        => (string) $generations,
                'showNicknames'      => $showNicknames ? '1' : '0',
                'showAddParentLinks' => $showAddParentLinks ? '1' : '0',
            ]),
            $module
        );

        $facade = (new DataFacade())
            ->setModule($module)
            ->setConfiguration($configuration)
            ->setRoute('webtrees-pedigree-chart');

        $node = $facade->createTreeStructure($individual);

        self::assertInstanceOf(Node::class, $node);

        return $node;
    }

    /**
     * Builds an individual with one name and the given parent family, if any.
     *
     * @param array<string, Fact>|null $factsByTag
     */
    private function individual(
        string $nameHtml,
        string $plainName,
        string $nickname,
        string $xref = 'X1',
        ?Family $family = null,
        bool $canEdit = false,
        ?array $factsByTag = null,
        string $chartBoxTags = '',
    ): Individual {
        $tree = self::createStub(Tree::class);
        $tree->method('name')->willReturn('main');
        $tree->method('getPreference')->willReturnCallback(
            static fn (string $name): string => $name === 'CHART_BOX_TAGS' ? $chartBoxTags : ''
        );

        $nameFact = self::createStub(Fact::class);
        $nameFact->method('attribute')->willReturnMap([
            ['TYPE', ''],
            ['NICK', $nickname],
        ]);

        $individual = self::createStub(Individual::class);
        $individual->method('tree')->willReturn($tree);
        $individual->method('xref')->willReturn($xref);
        $individual->method('url')->willReturn('/individual/' . $xref);
        $individual->method('sex')->willReturn('F');
        $individual->method('canShow')->willReturn(false);
        $individual->method('canShowName')->willReturn(false);
        $individual->method('canEdit')->willReturn($canEdit);
        $individual->method('isDead')->willReturn(false);
        $individual->method('getBirthDate')->willReturn($this->unknownDate());
        $individual->method('getDeathDate')->willReturn($this->unknownDate());
        $individual->method('childFamilies')->willReturn(new Collection($family instanceof Family ? [$family] : []));
        $individual->method('facts')->willReturnCallback(
            static function (array $filter = []) use ($nameFact, $factsByTag): Collection {
                $first = $filter[0] ?? '';
                $tag   = is_string($first) ? $first : '';

                if (($factsByTag === null) || ($tag === 'NAME')) {
                    return new Collection([$nameFact]);
                }

                return new Collection(isset($factsByTag[$tag]) ? [$factsByTag[$tag]] : []);
            }
        );
        $individual->method('getPrimaryName')->willReturn(0);
        $individual->method('getSecondaryName')->willReturn(0);
        $individual->method('getAllNames')->willReturn([
            [
                'full'   => $nameHtml,
                'fullNN' => $plainName,
                'type'   => 'BIRT',
                'surn'   => '',
                'givn'   => '',
                'sort'   => '',
            ],
        ]);

        return $individual;
    }

    /**
     * Builds a fact with the given label, place and value, and no date.
     */
    private function factStub(string $label, string $placeFull, string $placeShort, string $value): Fact
    {
        $place = self::createStub(Place::class);
        $place->method('gedcomName')->willReturn($placeFull);
        $place->method('firstParts')->willReturn(new Collection($placeShort === '' ? [] : [$placeShort]));

        $fact = self::createStub(Fact::class);
        $fact->method('label')->willReturn($label);
        $fact->method('date')->willReturn($this->unknownDate());
        $fact->method('place')->willReturn($place);
        $fact->method('value')->willReturn($value);

        return $fact;
    }

    /**
     * Builds a date that carries no information.
     */
    private function unknownDate(): Date
    {
        $date = self::createStub(Date::class);
        $date->method('display')->willReturn('');
        $date->method('isOK')->willReturn(false);

        return $date;
    }
}
