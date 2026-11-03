<?php

/**
 * This file is part of the package magicsunday/webtrees-pedigree-chart.
 *
 * For the full copyright and license information, please read the
 * LICENSE file that was distributed with this source code.
 */

declare(strict_types=1);

namespace MagicSunday\Webtrees\PedigreeChart\Test\Module;

use Fig\Http\Message\RequestMethodInterface;
use Fisharebest\Webtrees\Auth;
use Fisharebest\Webtrees\Contracts\IndividualFactoryInterface;
use Fisharebest\Webtrees\Contracts\UserInterface;
use Fisharebest\Webtrees\Date;
use Fisharebest\Webtrees\DB;
use Fisharebest\Webtrees\Fact;
use Fisharebest\Webtrees\Factories\CacheFactory;
use Fisharebest\Webtrees\Factories\ResponseFactory;
use Fisharebest\Webtrees\Http\Exceptions\HttpAccessDeniedException;
use Fisharebest\Webtrees\Http\Exceptions\HttpNotFoundException;
use Fisharebest\Webtrees\Individual;
use Fisharebest\Webtrees\Module\ModuleChartInterface;
use Fisharebest\Webtrees\Module\ModuleThemeInterface;
use Fisharebest\Webtrees\Registry;
use Fisharebest\Webtrees\Tree;
use Fisharebest\Webtrees\Validator;
use Fisharebest\Webtrees\View;
use GuzzleHttp\Psr7\HttpFactory;
use GuzzleHttp\Psr7\ServerRequest;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Collection;
use MagicSunday\Webtrees\ModuleBase\Testing\EnglishLocaleFixture;
use MagicSunday\Webtrees\ModuleBase\Testing\RoutingFixture;
use MagicSunday\Webtrees\PedigreeChart\Configuration;
use MagicSunday\Webtrees\PedigreeChart\Facade\DataFacade;
use MagicSunday\Webtrees\PedigreeChart\Model\Node;
use MagicSunday\Webtrees\PedigreeChart\Module;
use MagicSunday\Webtrees\PedigreeChart\Support\ContextText;
use MagicSunday\Webtrees\PedigreeChart\Test\Support\ModuleSettingsFixtureTrait;
use MagicSunday\Webtrees\PedigreeChart\Test\Support\ViewFixture;
use PHPUnit\Framework\Attributes\CoversClass;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\Attributes\UsesClass;
use PHPUnit\Framework\TestCase;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;

use function array_intersect_key;
use function json_decode;
use function ksort;
use function parse_str;
use function parse_url;
use function preg_match;

use const JSON_THROW_ON_ERROR;
use const PHP_URL_QUERY;

/**
 * Drives the GET request path of Module::handle(), the page and the chart partial, through the
 * access checks, the page title, the AJAX URL and the surname tradition of the tree.
 *
 * @author  Rico Sonntag <mail@ricosonntag.de>
 * @license https://opensource.org/licenses/GPL-3.0 GNU General Public License v3.0
 * @link    https://github.com/magicsunday/webtrees-pedigree-chart/
 */
#[CoversClass(Module::class)]
#[UsesClass(Configuration::class)]
#[UsesClass(DataFacade::class)]
#[UsesClass(Node::class)]
#[UsesClass(ContextText::class)]
final class ModuleRequestTest extends TestCase
{
    use ModuleSettingsFixtureTrait;

    private const int TREE_ID = 7;

    /**
     * The tree of the request, which the people of the test belong to.
     */
    private Tree $tree;

    /**
     * Prepares the container, the registry, the views and the database that a request needs.
     */
    protected function setUp(): void
    {
        parent::setUp();

        EnglishLocaleFixture::install();
        Validator::serverParams(new ServerRequest(RequestMethodInterface::METHOD_GET, '/'));
        ViewFixture::register();
        View::registerCustomView('::layouts/default', 'pedigree-test::layout');

        Registry::cache(new CacheFactory());
        Registry::responseFactory(new ResponseFactory(new HttpFactory(), new HttpFactory()));
        $this->registerContainer();
        $this->resetModulePrivacy();
    }

    /**
     * The two shapes of a chart request that handle() answers beside the redirect of a form post.
     *
     * @return array<string, array{bool}>
     */
    public static function chartRequestProvider(): array
    {
        return [
            'page shell'    => [false],
            'chart partial' => [true],
        ];
    }

    /**
     * A visitor is turned away when the administration shows the chart to members only, for the
     * page and for the chart partial alike.
     */
    #[Test]
    #[DataProvider('chartRequestProvider')]
    public function aVisitorIsTurnedAwayWhenTheChartIsForMembersOnly(bool $ajax): void
    {
        $this->restrictModuleTo(Auth::PRIV_USER);

        $this->expectException(HttpAccessDeniedException::class);

        $this->createModule()->handle($this->chartRequest($this->createIndividual(true), $ajax));
    }

    /**
     * The component check lets a visitor in while the administration shows the chart to visitors.
     */
    #[Test]
    #[DataProvider('chartRequestProvider')]
    public function aVisitorSeesTheChartWhileTheAdministrationShowsItToVisitors(bool $ajax): void
    {
        $response = $this->createModule()->handle($this->chartRequest($this->createIndividual(true), $ajax));

        self::assertSame(200, $response->getStatusCode());
        self::assertNotSame('', (string) $response->getBody());
    }

    /**
     * An unknown person is not found, whichever shape the request has.
     */
    #[Test]
    #[DataProvider('chartRequestProvider')]
    public function anUnknownPersonIsNotFound(bool $ajax): void
    {
        $this->expectException(HttpNotFoundException::class);

        $this->createModule()->handle($this->chartRequest(null, $ajax));
    }

    /**
     * A person that the visitor may not see is refused, whichever shape the request has.
     */
    #[Test]
    #[DataProvider('chartRequestProvider')]
    public function aPersonTheVisitorMayNotSeeIsRefused(bool $ajax): void
    {
        $this->expectException(HttpAccessDeniedException::class);

        $this->createModule()->handle($this->chartRequest($this->createIndividual(false), $ajax));
    }

    /**
     * The page shows the name of a person that is visible in its title.
     */
    #[Test]
    public function thePageTitleCarriesTheNameOfAVisiblePerson(): void
    {
        $response = $this->createModule()->handle($this->chartRequest($this->createIndividual(true), false));

        self::assertSame('Pedigree chart of Jane Doe', $this->pageTitleOf($response));
    }

    /**
     * A tree can show the relationships of private people, so the chart of a person whose name is
     * hidden is built. The title then names no one.
     */
    #[Test]
    public function thePageTitleNamesNoOneWhenTheNameIsHidden(): void
    {
        $this->tree = $this->createTree(['SHOW_PRIVATE_RELATIONSHIPS' => '1']);

        $response = $this->createModule()->handle($this->chartRequest($this->createIndividual(false), false));

        self::assertSame('Pedigree chart', $this->pageTitleOf($response));
        self::assertStringNotContainsString('Jane Doe', (string) $response->getBody());
    }

    /**
     * The page hands the form state of the request on to the chart partial, through an AJAX URL
     * that names the person, the tree and the submitted settings, so the partial rebuilds the chart
     * the visitor selected and not the preference defaults.
     */
    #[Test]
    public function thePageCarriesTheAjaxUrlOfTheChartPartialWithTheFormState(): void
    {
        $request = $this->chartRequest($this->createIndividual(true), false)
            ->withQueryParams(['generations' => '6', 'layout' => Configuration::LAYOUT_TOPBOTTOM]);

        $response = $this->createModule()->handle($request);

        self::assertSame(1, preg_match('#ajaxUrl: (".*")#', (string) $response->getBody(), $matches));

        /** @var string $ajaxUrl */
        $ajaxUrl = json_decode($matches[1], true, 512, JSON_THROW_ON_ERROR);

        self::assertStringStartsWith('/route/webtrees-pedigree-chart?', $ajaxUrl);

        parse_str((string) parse_url($ajaxUrl, PHP_URL_QUERY), $query);

        $expected = [
            'xref'        => 'I1',
            'tree'        => 'main',
            'ajax'        => '1',
            'generations' => '6',
            'layout'      => Configuration::LAYOUT_TOPBOTTOM,
        ];

        $actual = array_intersect_key($query, $expected);

        ksort($expected);
        ksort($actual);

        self::assertSame($expected, $actual);
    }

    /**
     * The chart partial carries the chart of the requested person.
     */
    #[Test]
    public function theChartPartialCarriesTheDataOfTheRequestedPerson(): void
    {
        $response = $this->createModule()->handle($this->chartRequest($this->createIndividual(true), true));
        $body     = (string) $response->getBody();

        self::assertStringContainsString('"xref":"I1"', $body);
        self::assertStringNotContainsString('pedigree-chart-url', $body, 'the partial has no page shell around it');
    }

    /**
     * The surname tradition of the tree decides how names are shortened when the setting is on
     * automatic. An Icelandic tree shortens by the surname, every other tradition by the given name.
     *
     * @return array<string, array{string, string}>
     */
    public static function surnameTraditionProvider(): array
    {
        return [
            'icelandic tradition' => ['icelandic', 'SURNAME'],
            'paternal tradition'  => ['paternal', 'GIVEN'],
            'no tradition'        => ['', 'GIVEN'],
        ];
    }

    /**
     * The chart partial hands the abbreviation that the surname tradition resolves to on to the script.
     */
    #[Test]
    #[DataProvider('surnameTraditionProvider')]
    public function theChartPartialResolvesTheNameAbbreviationFromTheSurnameTradition(
        string $tradition,
        string $expected,
    ): void {
        $this->tree = $this->createTree(['SURNAME_TRADITION' => $tradition]);

        $response = $this->createModule()->handle($this->chartRequest($this->createIndividual(true), true));

        self::assertStringContainsString('nameAbbreviation: "' . $expected . '"', (string) $response->getBody());
    }

    /**
     * A concrete setting wins over the surname tradition of the tree.
     */
    #[Test]
    public function aConcreteNameAbbreviationWinsOverTheSurnameTradition(): void
    {
        $this->tree = $this->createTree(['SURNAME_TRADITION' => 'icelandic']);

        $request = $this->chartRequest($this->createIndividual(true), true)
            ->withQueryParams(['ajax' => '1', 'nameAbbreviation' => 'GIVEN']);

        $response = $this->createModule()->handle($request);

        self::assertStringContainsString('nameAbbreviation: "GIVEN"', (string) $response->getBody());
    }

    /**
     * Returns the text of the title heading of the rendered page.
     */
    private function pageTitleOf(ResponseInterface $response): string
    {
        self::assertSame(1, preg_match('#<h2 class="wt-page-title">(.*?)</h2>#s', (string) $response->getBody(), $matches));

        return trim($matches[1]);
    }

    /**
     * Creates a module with the name that its views and its access level are registered under.
     */
    private function createModule(): Module
    {
        return $this->createModuleWithPreferences([]);
    }

    /**
     * Creates a person named Jane Doe with everything that the facade reads for the chart. A visible
     * person shows the name and the person, a private person neither.
     */
    private function createIndividual(bool $visible): Individual
    {
        $unknownDate = self::createStub(Date::class);
        $unknownDate->method('display')->willReturn('');
        $unknownDate->method('isOK')->willReturn(false);

        $nameFact = self::createStub(Fact::class);
        $nameFact->method('attribute')->willReturn('');

        $individual = self::createStub(Individual::class);
        $individual->method('tree')->willReturn($this->tree);
        $individual->method('xref')->willReturn('I1');
        $individual->method('url')->willReturn('/individual/I1');
        $individual->method('sex')->willReturn('F');
        $individual->method('fullName')->willReturn('Jane Doe');
        $individual->method('canShow')->willReturn($visible);
        $individual->method('canShowName')->willReturn($visible);
        $individual->method('canEdit')->willReturn(false);
        $individual->method('isDead')->willReturn(false);
        $individual->method('getBirthDate')->willReturn($unknownDate);
        $individual->method('getDeathDate')->willReturn($unknownDate);
        $individual->method('childFamilies')->willReturn(new Collection());
        $individual->method('facts')->willReturn(new Collection([$nameFact]));
        $individual->method('findHighlightedMediaFile')->willReturn(null);
        $individual->method('getPrimaryName')->willReturn(0);
        $individual->method('getSecondaryName')->willReturn(0);
        $individual->method('getAllNames')->willReturn([
            [
                'full'   => '<span class="NAME" dir="auto" translate="no">Jane <span class="SURN">Doe</span></span>',
                'fullNN' => 'Jane Doe',
                'type'   => 'BIRT',
                'surn'   => 'Doe',
                'givn'   => 'Jane',
                'sort'   => '',
            ],
        ]);

        return $individual;
    }

    /**
     * Creates the tree of the request.
     *
     * @param array<string, string> $preferences The tree preferences that differ from the defaults, which are
     *                                           "1" for every preference except the display of private relationships
     *                                           and the surname tradition
     */
    private function createTree(array $preferences = []): Tree
    {
        $tree = self::createStub(Tree::class);
        $tree->method('id')->willReturn(self::TREE_ID);
        $tree->method('name')->willReturn('main');
        $tree->method('getPreference')->willReturnCallback(
            static fn (string $name): string => $preferences[$name] ?? match ($name) {
                'SHOW_PRIVATE_RELATIONSHIPS', 'SURNAME_TRADITION' => '',
                default                                           => '1',
            }
        );

        return $tree;
    }

    /**
     * Builds the GET request of the chart page or of the chart partial for the person that the
     * factory finds, or for no person.
     */
    private function chartRequest(?Individual $individual, bool $ajax): ServerRequestInterface
    {
        $factory = self::createStub(IndividualFactoryInterface::class);
        $factory->method('make')->willReturn($individual);

        Registry::individualFactory($factory);

        return (new ServerRequest(RequestMethodInterface::METHOD_GET, '/'))
            ->withAttribute('tree', $this->tree)
            ->withAttribute('user', self::createStub(UserInterface::class))
            ->withAttribute('xref', 'I1')
            ->withQueryParams($ajax ? ['ajax' => '1'] : []);
    }

    /**
     * Registers the route factory and the container with the services that the module asks for while
     * it answers a request.
     */
    private function registerContainer(): void
    {
        $theme = self::createStub(ModuleThemeInterface::class);
        $theme->method('stylesheets')->willReturn(['/theme.css']);

        RoutingFixture::register([
            ModuleThemeInterface::class   => $theme,
            ServerRequestInterface::class => new ServerRequest(RequestMethodInterface::METHOD_GET, '/'),
        ]);
    }

    /**
     * Empties the access levels of the modules and gives the tests the table that holds them.
     */
    private function resetModulePrivacy(): void
    {
        $this->tree = $this->createTree();

        // The table lives in the in-memory database that the preference fixture boots.
        $this->createModuleWithPreferences([]);

        $schema = DB::connection()->getSchemaBuilder();

        if (!$schema->hasTable('module_privacy')) {
            $schema->create('module_privacy', static function (Blueprint $table): void {
                $table->integer('gedcom_id');
                $table->string('module_name');
                $table->string('interface');
                $table->integer('access_level');
            });
        }

        DB::table('module_privacy')->delete();
    }

    /**
     * Stores the access level that the administration sets for the chart interface of the module.
     */
    private function restrictModuleTo(int $accessLevel): void
    {
        DB::table('module_privacy')->insert([
            'gedcom_id'    => self::TREE_ID,
            'module_name'  => 'webtrees-pedigree-chart',
            'interface'    => ModuleChartInterface::class,
            'access_level' => $accessLevel,
        ]);
    }
}
