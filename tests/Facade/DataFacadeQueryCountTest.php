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
use Fisharebest\Webtrees\Auth;
use Fisharebest\Webtrees\DB;
use Fisharebest\Webtrees\Factories\CacheFactory;
use Fisharebest\Webtrees\Individual;
use Fisharebest\Webtrees\Registry;
use Fisharebest\Webtrees\Services\ChartService;
use Fisharebest\Webtrees\Session;
use Fisharebest\Webtrees\Site;
use Fisharebest\Webtrees\Tree;
use GuzzleHttp\Psr7\ServerRequest;
use MagicSunday\Webtrees\ModuleBase\Processor\ImageProcessor;
use MagicSunday\Webtrees\PedigreeChart\Configuration;
use MagicSunday\Webtrees\PedigreeChart\Facade\DataFacade;
use MagicSunday\Webtrees\PedigreeChart\Model\Node;
use MagicSunday\Webtrees\PedigreeChart\Module;
use MagicSunday\Webtrees\PedigreeChart\Support\MediaPreloader;
use MagicSunday\Webtrees\PedigreeChart\Test\Support\RealTreeFixtureTrait;
use PHPUnit\Framework\Attributes\CoversClass;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\Attributes\UsesClass;
use PHPUnit\Framework\TestCase;

use function array_filter;
use function count;
use function file_put_contents;
use function glob;
use function implode;
use function intdiv;
use function is_dir;
use function is_scalar;
use function json_decode;
use function json_encode;
use function max;
use function mkdir;
use function rmdir;
use function str_contains;
use function sys_get_temp_dir;
use function uniqid;
use function unlink;

use const JSON_THROW_ON_ERROR;

/**
 * Counts the database statements that one request of the chart sends for the media objects, over a
 * real imported tree. The tree is a complete pedigree, so every person of every generation has two
 * parents and the number of people doubles with each generation. The media statements of a request
 * have to grow with the number of generations and not with the number of people, so the tests
 * compare the request with the same request that has the highlight images switched off and derive
 * the bounds from the shape of the tree instead of pinning a count.
 *
 * The people carry numeric xrefs, so a number that turns into an integer array key on its way
 * through the preload would fail the typed record factories.
 *
 * @author  Rico Sonntag <mail@ricosonntag.de>
 * @license https://opensource.org/licenses/GPL-3.0 GNU General Public License v3.0
 * @link    https://github.com/magicsunday/webtrees-pedigree-chart/
 */
#[CoversClass(DataFacade::class)]
#[UsesClass(Configuration::class)]
#[UsesClass(MediaPreloader::class)]
#[UsesClass(Module::class)]
#[UsesClass(Node::class)]
final class DataFacadeQueryCountTest extends TestCase
{
    use RealTreeFixtureTrait;

    /**
     * The number of ancestor generations of the pedigree, which is the most that the chart shows.
     */
    private const int DEPTH = 10;

    /**
     * The most values that one statement of a request may bind. A generation of the pedigree is
     * wider than this, so a lookup that sends a whole generation in one statement is over it.
     */
    private const int PLACEHOLDER_BUDGET = 300;

    /**
     * The module of the chart, which the facade reads its settings and its routes from.
     */
    private Module $module;

    /**
     * The index directory that holds the media files of the pedigree, or an empty string while
     * the test has none.
     */
    private string $indexDirectory = '';

    /**
     * Boots webtrees on a real schema and registers the module of the chart with its route.
     */
    protected function setUp(): void
    {
        parent::setUp();

        $this->bootRealWebtrees();

        DB::table('module')->insert(['module_name' => 'webtrees-pedigree-chart']);

        $this->module = new Module(self::createStub(ChartService::class), new DataFacade());
        $this->module->setName('webtrees-pedigree-chart');
        $this->module->boot();
    }

    /**
     * Drops the viewer and restores the minimal database of the other tests.
     */
    protected function tearDown(): void
    {
        Auth::logout();
        Session::clear();
        Site::$preferences = [];
        Registry::cache(new CacheFactory());

        $this->removeMediaFiles();
        $this->restoreMinimalDatabase();

        parent::tearDown();
    }

    /**
     * The media lookup of a request grows with the number of generations and not with the number of
     * people, for the administrator and for a visitor, with and without the detail panel. The extra
     * statements of the media are those that the same request sends beyond the request that has the
     * highlight images switched off, so nothing but the media is counted. The visitor pays for the
     * privacy check of every media object and for the records it is linked to.
     *
     * @param bool $visitor     Whether a visitor requests the chart and not the administrator
     * @param bool $detailPanel Whether the detail panel is on
     */
    #[Test]
    #[DataProvider('viewersAndPanels')]
    public function mediaStatementsGrowWithTheGenerationsAndNotWithThePeople(bool $visitor, bool $detailPanel): void
    {
        $tree = $this->importPedigree();

        if ($visitor) {
            Auth::logout();
        }

        $tree->setPreference('SHOW_HIGHLIGHT_IMAGES', '');
        $without = count($this->statements($tree, self::DEPTH, $detailPanel));

        $tree->setPreference('SHOW_HIGHLIGHT_IMAGES', '1');
        $with = count($this->statements($tree, self::DEPTH, $detailPanel));

        // One media statement of every kind for each chunk of a generation: the media objects, their
        // pending changes, the links and the records that the links point to.
        $budget = 0;

        for ($generation = 1; $generation <= self::DEPTH; ++$generation) {
            $budget += 5 * intdiv((2 ** ($generation - 1)) + MediaPreloader::CHUNK_SIZE - 1, MediaPreloader::CHUNK_SIZE);
        }

        self::assertGreaterThan(0, $with - $without, 'The media of the pedigree are looked up.');
        self::assertLessThanOrEqual($budget, $with - $without);
        self::assertLessThan(2 ** self::DEPTH, $with - $without);
    }

    /**
     * No media statement binds as many values as a whole generation holds, so a tree of any width stays
     * below the placeholder ceiling of the database, for the administrator and for a visitor alike.
     *
     * @param bool $visitor Whether a visitor requests the chart and not the administrator
     */
    #[Test]
    #[DataProvider('viewers')]
    public function noMediaStatementBindsAWholeGeneration(bool $visitor): void
    {
        $tree = $this->importPedigree();

        if ($visitor) {
            Auth::logout();
        }

        $widest = 0;

        foreach ($this->statements($tree, self::DEPTH) as $statement) {
            if (
                str_contains($statement['query'], '"wt_media"')
                || str_contains($statement['query'], '"wt_link"')
            ) {
                $widest = max($widest, count($statement['bindings']));
            }
        }

        self::assertGreaterThan(0, $widest);
        self::assertLessThan(self::PLACEHOLDER_BUDGET, $widest);
    }

    /**
     * The images of the chart are those that the highlight image of the person yields without any
     * preload, for the administrator and for a visitor. Half of the people have the file of their image
     * on disk, so the chart shows a thumbnail for them and the silhouette for the others.
     *
     * @param bool $visitor Whether a visitor requests the chart and not the administrator
     */
    #[Test]
    #[DataProvider('viewers')]
    public function theImagesOfTheChartMatchTheHighlightImageOfEveryPerson(bool $visitor): void
    {
        $tree = $this->importPedigree();

        if ($visitor) {
            Auth::logout();
        }

        $payload  = $this->imagesInOrder($this->payload($tree));
        $expected = [];

        Registry::cache(new CacheFactory());

        foreach ($this->heapOrder(self::DEPTH) as $person) {
            $individual = Registry::individualFactory()->make((string) $person, $tree);
            self::assertInstanceOf(Individual::class, $individual);

            $processor = new ImageProcessor($this->module, $individual);

            $expected[] = [
                'xref'       => (string) $person,
                'thumbnail'  => $processor->getHighlightImageUrl(),
                'silhouette' => $processor->getSilhouetteUrl(),
            ];
        }

        self::assertSame($expected, $payload);

        $thumbnails = array_filter($payload, static fn (array $images): bool => str_contains($images['thumbnail'], 'media-thumbnail'));

        self::assertCount(2 ** (self::DEPTH - 1), $thumbnails, 'Half of the people show a thumbnail.');
    }

    /**
     * Pairs every viewer with the state of the detail panel.
     *
     * @return array<string, array{bool, bool}>
     */
    public static function viewersAndPanels(): array
    {
        return [
            'administrator, panel on'  => [false, true],
            'administrator, panel off' => [false, false],
            'visitor, panel on'        => [true, true],
            'visitor, panel off'       => [true, false],
        ];
    }

    /**
     * Lists the viewers.
     *
     * @return array<string, array{bool}>
     */
    public static function viewers(): array
    {
        return [
            'administrator' => [false],
            'visitor'       => [true],
        ];
    }

    /**
     * Imports the complete pedigree. The person n has the parents 2n and 2n+1 in the family that
     * familyXref() names, and every person has a media object of their own as the highlight image.
     * The file of the image exists for the people with an odd number only. Everybody in the pedigree
     * is dead and so public, but the tree hides living people, so the visibility of a media object
     * depends on the records that it is linked to.
     */
    private function importPedigree(): Tree
    {
        $people   = (2 ** self::DEPTH) - 1;
        $families = (2 ** (self::DEPTH - 1)) - 1;

        $lines = ['0 HEAD', '1 GEDC', '2 VERS 5.5.1', '2 FORM LINKED', '1 CHAR UTF-8'];

        for ($person = 1; $person <= $people; ++$person) {
            $lines[] = '0 @' . $person . '@ INDI';
            $lines[] = '1 NAME Given' . $person . ' /Family' . ($person % 7) . '/';
            $lines[] = '1 SEX ' . (($person % 2 === 0) ? 'M' : 'F');
            $lines[] = '1 BIRT';
            $lines[] = '2 DATE ' . (1500 + ($person % 400));
            $lines[] = '2 PLAC Place' . ($person % 11);
            $lines[] = '1 DEAT';
            $lines[] = '2 DATE ' . (1950 + ($person % 40));
            $lines[] = '1 OBJE @' . $this->mediaXref($person) . '@';
            $lines[] = '1 FAMC @' . $this->familyXref($person) . '@';

            if ($person >= 2) {
                $lines[] = '1 FAMS @' . $this->familyXref(intdiv($person, 2)) . '@';
            }
        }

        // Every person has a parent family, as people in real trees do. The family of a person of
        // the last generation has no parents, so the pedigree ends there.
        for ($family = 1; $family <= $people; ++$family) {
            $lines[] = '0 @' . $this->familyXref($family) . '@ FAM';

            if ($family <= $families) {
                $lines[] = '1 HUSB @' . (2 * $family) . '@';
                $lines[] = '1 WIFE @' . ((2 * $family) + 1) . '@';
            }

            $lines[] = '1 CHIL @' . $family . '@';
        }

        for ($person = 1; $person <= $people; ++$person) {
            $lines[] = '0 @' . $this->mediaXref($person) . '@ OBJE';
            $lines[] = '1 FILE person' . $person . '.jpg';
            $lines[] = '2 FORM jpg';
        }

        $this->createMediaFiles($people);

        $lines[] = '0 TRLR';

        $tree = $this->importGedcom(implode("\n", $lines), 'pedigree');

        $tree->setPreference('HIDE_LIVE_PEOPLE', '1');
        $tree->setPreference('SHOW_LIVING_NAMES', (string) Auth::PRIV_PRIVATE);
        $tree->setPreference('SHOW_DEAD_PEOPLE', (string) Auth::PRIV_PRIVATE);
        $tree->setPreference('SHOW_HIGHLIGHT_IMAGES', '1');

        return $tree;
    }

    /**
     * Returns the xref of the family of a person, which is numeric like the xrefs of the people.
     *
     * @param int $person The person whose parents the family holds
     */
    private function familyXref(int $person): string
    {
        return (string) (5000 + $person);
    }

    /**
     * Returns the xref of the media object of a person, which is numeric like the xrefs of the people.
     *
     * @param int $person The person who has the media object as the highlight image
     */
    private function mediaXref(int $person): string
    {
        return (string) (20000 + $person);
    }

    /**
     * Creates the files of the images of the people with an odd number, in the media folder of a data
     * directory that the tree reads. The other people have a media object whose file is missing.
     *
     * @param int $people The number of people of the pedigree
     */
    private function createMediaFiles(int $people): void
    {
        $this->indexDirectory = sys_get_temp_dir() . '/pedigree-chart-pedigree-' . uniqid('', true) . '/';

        if (!mkdir($this->indexDirectory . 'media', 0o777, true) && !is_dir($this->indexDirectory . 'media')) {
            self::fail('The media directory could not be created.');
        }

        for ($person = 1; $person <= $people; $person += 2) {
            file_put_contents($this->indexDirectory . 'media/person' . $person . '.jpg', 'image');
        }

        Site::setPreference('INDEX_DIRECTORY', $this->indexDirectory);
    }

    /**
     * Removes the media files and the directories of the test.
     */
    private function removeMediaFiles(): void
    {
        if ($this->indexDirectory === '') {
            return;
        }

        $files = glob($this->indexDirectory . 'media/*');

        foreach (($files === false) ? [] : $files as $file) {
            unlink($file);
        }

        rmdir($this->indexDirectory . 'media');
        rmdir($this->indexDirectory);

        $this->indexDirectory = '';
    }

    /**
     * Returns the statements of one request on a cold record cache.
     *
     * @param Tree $tree        The imported tree
     * @param int  $generations The number of generations of the chart
     * @param bool $detailPanel Whether the detail panel is on
     *
     * @return list<array{query: string, bindings: list<string>}>
     */
    private function statements(Tree $tree, int $generations, bool $detailPanel = true): array
    {
        Registry::cache(new CacheFactory());

        $connection = DB::connection();
        $connection->enableQueryLog();
        $connection->flushQueryLog();

        $this->nodeTree($tree, $generations, $detailPanel);

        $log = $connection->getQueryLog();
        $connection->disableQueryLog();

        $statements = [];

        foreach ($log as $entry) {
            $bindings = [];

            foreach ($entry['bindings'] as $binding) {
                $bindings[] = is_scalar($binding) ? (string) $binding : '';
            }

            $statements[] = [
                'query'    => $entry['query'],
                'bindings' => $bindings,
            ];
        }

        return $statements;
    }

    /**
     * Returns the JSON payload of the chart as the current viewer, on a cold record cache.
     *
     * @param Tree $tree The imported tree
     */
    private function payload(Tree $tree): string
    {
        Registry::cache(new CacheFactory());

        return json_encode($this->nodeTree($tree, self::DEPTH), JSON_THROW_ON_ERROR);
    }

    /**
     * Builds the node tree of the person 1.
     *
     * @param Tree $tree        The imported tree
     * @param int  $generations The number of generations of the chart
     * @param bool $detailPanel Whether the detail panel is on
     */
    private function nodeTree(Tree $tree, int $generations, bool $detailPanel = true): Node
    {
        $individual = Registry::individualFactory()->make('1', $tree);
        self::assertInstanceOf(Individual::class, $individual);

        $configuration = new Configuration(
            (new ServerRequest(RequestMethodInterface::METHOD_GET, '/'))->withQueryParams([
                'generations'     => (string) $generations,
                'showDetailPanel' => $detailPanel ? '1' : '0',
            ]),
            $this->module
        );

        $node = (new DataFacade())
            ->setModule($this->module)
            ->setConfiguration($configuration)
            ->setRoute('webtrees-pedigree-chart')
            ->createTreeStructure($individual);

        self::assertInstanceOf(Node::class, $node);

        return $node;
    }

    /**
     * Lists the xref and the images of every person of a payload, depth first.
     *
     * @param string $payload The JSON payload
     *
     * @return list<array{xref: string, thumbnail: string, silhouette: string}>
     */
    private function imagesInOrder(string $payload): array
    {
        $tree = json_decode($payload, true, 512, JSON_THROW_ON_ERROR);
        self::assertIsArray($tree);

        return $this->collectImages($tree);
    }

    /**
     * Lists the xref and the images of a decoded node and of the parents below it, depth first.
     *
     * @param array<array-key, mixed> $node A node of the decoded payload
     *
     * @return list<array{xref: string, thumbnail: string, silhouette: string}>
     */
    private function collectImages(array $node): array
    {
        $data = $node['data'] ?? null;
        self::assertIsArray($data);
        self::assertIsString($data['xref'] ?? null);
        self::assertIsString($data['thumbnail'] ?? null);
        self::assertIsString($data['silhouette'] ?? null);

        $images = [
            [
                'xref'       => $data['xref'],
                'thumbnail'  => $data['thumbnail'],
                'silhouette' => $data['silhouette'],
            ],
        ];

        $parents = $node['parents'] ?? [];
        self::assertIsArray($parents);

        foreach ($parents as $parent) {
            self::assertIsArray($parent);
            $images = [...$images, ...$this->collectImages($parent)];
        }

        return $images;
    }

    /**
     * Lists the xrefs of the people of the pedigree as the chart orders them, which is depth first,
     * the father before the mother.
     *
     * @param int $generations The number of generations
     *
     * @return list<int>
     */
    private function heapOrder(int $generations, int $person = 1, int $generation = 1): array
    {
        if ($generation > $generations) {
            return [];
        }

        return [
            $person,
            ...$this->heapOrder($generations, 2 * $person, $generation + 1),
            ...$this->heapOrder($generations, (2 * $person) + 1, $generation + 1),
        ];
    }
}
