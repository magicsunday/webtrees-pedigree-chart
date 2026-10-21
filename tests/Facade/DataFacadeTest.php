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
use Fisharebest\Webtrees\Individual;
use Fisharebest\Webtrees\Tree;
use GuzzleHttp\Psr7\ServerRequest;
use Illuminate\Support\Collection;
use MagicSunday\Webtrees\PedigreeChart\Configuration;
use MagicSunday\Webtrees\PedigreeChart\Facade\DataFacade;
use MagicSunday\Webtrees\PedigreeChart\Model\Node;
use MagicSunday\Webtrees\PedigreeChart\Model\NodeData;
use MagicSunday\Webtrees\PedigreeChart\Test\Support\ModuleSettingsFixtureTrait;
use MagicSunday\Webtrees\PedigreeChart\Test\Support\RouteFactoryFixture;
use PHPUnit\Framework\Attributes\CoversClass;
use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\Attributes\UsesClass;
use PHPUnit\Framework\TestCase;

use function json_decode;
use function json_encode;

use const JSON_THROW_ON_ERROR;

/**
 * Verifies how the data facade hands the name of an individual to the front
 * end, as ordered segments next to the flat name.
 *
 * @author  Rico Sonntag <mail@ricosonntag.de>
 * @license https://opensource.org/licenses/GPL-3.0 GNU General Public License v3.0
 * @link    https://github.com/magicsunday/webtrees-pedigree-chart/
 */
#[CoversClass(DataFacade::class)]
#[UsesClass(Configuration::class)]
#[UsesClass(Node::class)]
#[UsesClass(NodeData::class)]
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
            ],
            array_keys($payload)
        );
    }

    /**
     * Builds the tree of one individual and returns the serialised data of its
     * root node.
     *
     * @return array{name: string, nameSegments: list<array{label: string, kind: string, isPreferred: bool}>}
     */
    private function payloadFor(string $nameHtml, string $plainName, string $nickname, bool $showNicknames): array
    {
        RouteFactoryFixture::register();

        $module        = $this->createModuleWithPreferences([]);
        $configuration = new Configuration(
            (new ServerRequest(RequestMethodInterface::METHOD_GET, '/'))->withQueryParams([
                'generations'   => '1',
                'showNicknames' => $showNicknames ? '1' : '0',
            ]),
            $module
        );

        $facade = (new DataFacade())
            ->setModule($module)
            ->setConfiguration($configuration)
            ->setRoute('webtrees-pedigree-chart');

        $node = $facade->createTreeStructure($this->individual($nameHtml, $plainName, $nickname));

        self::assertInstanceOf(Node::class, $node);

        /** @var array{data: array{name: string, nameSegments: list<array{label: string, kind: string, isPreferred: bool}>}} $serialised */
        $serialised = json_decode(json_encode($node, JSON_THROW_ON_ERROR), true, 512, JSON_THROW_ON_ERROR);

        return $serialised['data'];
    }

    /**
     * Builds an individual with one name and no parents.
     */
    private function individual(string $nameHtml, string $plainName, string $nickname): Individual
    {
        $tree = self::createStub(Tree::class);
        $tree->method('name')->willReturn('main');
        $tree->method('getPreference')->willReturn('');

        $nameFact = self::createStub(Fact::class);
        $nameFact->method('attribute')->willReturnMap([
            ['TYPE', ''],
            ['NICK', $nickname],
        ]);

        $individual = self::createStub(Individual::class);
        $individual->method('tree')->willReturn($tree);
        $individual->method('xref')->willReturn('X1');
        $individual->method('url')->willReturn('/individual/X1');
        $individual->method('sex')->willReturn('F');
        $individual->method('canShow')->willReturn(false);
        $individual->method('canShowName')->willReturn(false);
        $individual->method('canEdit')->willReturn(false);
        $individual->method('isDead')->willReturn(false);
        $individual->method('getBirthDate')->willReturn($this->unknownDate());
        $individual->method('getDeathDate')->willReturn($this->unknownDate());
        $individual->method('childFamilies')->willReturn(new Collection());
        $individual->method('facts')->willReturn(new Collection([$nameFact]));
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
