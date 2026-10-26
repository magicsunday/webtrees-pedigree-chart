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
use Fisharebest\Webtrees\Contracts\UserInterface;
use Fisharebest\Webtrees\Individual;
use Fisharebest\Webtrees\Services\ChartService;
use Fisharebest\Webtrees\Tree;
use GuzzleHttp\Psr7\ServerRequest;
use MagicSunday\Webtrees\ModuleBase\Model\PlaceFormatChoice;
use MagicSunday\Webtrees\PedigreeChart\Configuration;
use MagicSunday\Webtrees\PedigreeChart\Facade\DataFacade;
use MagicSunday\Webtrees\PedigreeChart\Module;
use MagicSunday\Webtrees\PedigreeChart\Test\Support\EnglishLocaleFixture;
use MagicSunday\Webtrees\PedigreeChart\Test\Support\ModuleSettingsFixtureTrait;
use MagicSunday\Webtrees\PedigreeChart\Test\Support\RouteFactoryFixture;
use PHPUnit\Framework\Attributes\CoversClass;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\Attributes\UsesClass;
use PHPUnit\Framework\TestCase;

/**
 * Validates module metadata exposure and chart helpers.
 */
#[CoversClass(Module::class)]
#[UsesClass(Configuration::class)]
final class ModuleTest extends TestCase
{
    use ModuleSettingsFixtureTrait;

    /**
     * Ensures trait-provided helpers return expected metadata and URLs.
     */
    #[Test]
    public function traitHelpersExposeExpectedValues(): void
    {
        RouteFactoryFixture::register();

        $chartService = self::createStub(ChartService::class);
        $module       = new Module($chartService, new DataFacade());
        $individual   = self::createStub(Individual::class);
        $tree         = self::createStub(Tree::class);

        EnglishLocaleFixture::install();

        $individual->method('fullName')->willReturn('Example Person');
        $individual->method('xref')->willReturn('I1');
        $individual->method('tree')->willReturn($tree);
        $tree->method('name')->willReturn('main');

        self::assertSame('menu-chart-pedigree', $module->chartMenuClass());
        self::assertStringContainsString('Example Person', $module->chartTitle($individual));
        self::assertStringContainsString('/route/webtrees-pedigree-chart?', $module->chartUrl($individual));
    }

    /**
     * Names the individual in the page title only when the visitor may see
     * the name, and falls back to the plain chart title otherwise.
     */
    #[Test]
    public function pageTitleNamesTheIndividualOnlyWhenTheNameIsVisible(): void
    {
        EnglishLocaleFixture::install();

        $module = new Module(self::createStub(ChartService::class), new DataFacade());

        $visible = self::createStub(Individual::class);
        $visible->method('canShowName')->willReturn(true);
        $visible->method('fullName')->willReturn('Example Person');

        $hidden = self::createStub(Individual::class);
        $hidden->method('canShowName')->willReturn(false);
        $hidden->method('fullName')->willReturn('Secret Person');

        self::assertSame('Pedigree chart of Example Person', $module->pageTitle($visible));
        self::assertSame('Pedigree chart', $module->pageTitle($hidden));
    }

    /**
     * The page needs the number of optional rows that the tree names for the chart box, because
     * every box reserves the rows of the fullest box and the additional facts are only shown
     * when there is at least one. The birth and death equivalents have rows of their own.
     */
    #[Test]
    #[DataProvider('chartBoxTagsProvider')]
    public function theChartParametersCountTheOptionalFactsOfTheTree(string $chartBoxTags, int $expected): void
    {
        EnglishLocaleFixture::install();

        $configuration = new Configuration(
            new ServerRequest(RequestMethodInterface::METHOD_GET, '/'),
            $this->createModuleWithPreferences([])
        );

        $tree = self::createStub(Tree::class);
        $tree->method('getPreference')->willReturnCallback(
            static fn (string $name): string => $name === 'CHART_BOX_TAGS' ? $chartBoxTags : ''
        );

        $module = new Module(
            self::createStub(ChartService::class),
            (new DataFacade())->setConfiguration($configuration)
        );

        self::assertSame($expected, $module->getChartParameters($configuration, $tree)['optionalRows']);
    }

    /**
     * @return array<string, array{string, int}>
     */
    public static function chartBoxTagsProvider(): array
    {
        return [
            'two optional tags'                     => ['OCCU,RESI', 2],
            'a birth equivalent is no optional row' => ['BIRT,OCCU', 1],
            'a tree that names no tag has no rows'  => ['', 0],
        ];
    }

    /**
     * Pins that saving the administration form stores the place and fact options
     * as the defaults of the chart, the place format under its stored value.
     */
    #[Test]
    public function theAdminActionStoresThePlaceAndFactDefaults(): void
    {
        RouteFactoryFixture::register();
        EnglishLocaleFixture::install();

        $module  = $this->createModuleWithPreferences([]);
        $request = (new ServerRequest(RequestMethodInterface::METHOD_POST, '/'))
            ->withParsedBody([
                'showPlaces'          => '1',
                'showAdditionalFacts' => '0',
                'placeFormat'         => 'levels-2',
            ]);

        $module->postAdminAction($request);

        self::assertSame('1', $module->getPreference('default_showPlaces'));
        self::assertSame('levels-2', $module->getPreference('default_placeFormat'));

        // A switch that is off is stored as an empty string, like every other switch of
        // the module, so what counts is that the stored defaults read back as submitted.
        $stored = new Configuration(new ServerRequest(RequestMethodInterface::METHOD_GET, '/'), $module);

        self::assertTrue($stored->getShowPlaces());
        self::assertFalse($stored->getShowAdditionalFacts());
        self::assertSame(PlaceFormatChoice::Levels2, $stored->getPlaceFormatChoice());
    }

    /**
     * Pins that the redirect which turns a form POST into a GET carries every
     * route toggle parameter, so a setting added to the shared list cannot be
     * missing from the URL the user lands on.
     */
    #[Test]
    public function postRedirectCarriesEveryRouteToggleParameter(): void
    {
        RouteFactoryFixture::register();

        $module  = $this->createModuleWithPreferences([]);
        $tree    = self::createStub(Tree::class);
        $request = (new ServerRequest(RequestMethodInterface::METHOD_POST, '/'))
            ->withParsedBody([
                'xref'                => 'I1',
                'generations'         => '3',
                'layout'              => Configuration::LAYOUT_TOPBOTTOM,
                'openNewTabOnClick'   => '0',
                'showAlternativeName' => '1',
                'showNicknames'       => '1',
                'showFamilyColors'    => '0',
                'paternalColor'       => '#112233',
                'maternalColor'       => '#445566',
                'showAddParentLinks'  => '1',
                'showPlaces'          => '1',
                'showAdditionalFacts' => '0',
            ])
            ->withAttribute('tree', $tree)
            ->withAttribute('xref', 'I1')
            ->withAttribute('user', self::createStub(UserInterface::class));

        $tree->method('name')->willReturn('main');

        $response = $module->handle($request);

        parse_str((string) parse_url($response->getHeaderLine('location'), PHP_URL_QUERY), $query);

        $expected = (new Configuration($request, $module))->getRouteToggleParams();

        self::assertNotSame([], $expected);

        foreach ($expected as $name => $value) {
            self::assertArrayHasKey($name, $query);
            self::assertSame((string) $value, $query[$name]);
        }

        // The submitted values, not the preference defaults, have to reach the
        // URL, so the expectation is spelled out instead of derived from the
        // same configuration as the redirect.
        self::assertSame('3', $query['generations']);
        self::assertSame(Configuration::LAYOUT_TOPBOTTOM, $query['layout']);
        self::assertSame('0', $query['openNewTabOnClick']);
        self::assertSame('1', $query['showAlternativeName']);
        self::assertSame('1', $query['showNicknames']);
        self::assertSame('0', $query['showFamilyColors']);
        self::assertSame('#112233', $query['paternalColor']);
        self::assertSame('#445566', $query['maternalColor']);
        self::assertSame('1', $query['showAddParentLinks']);
        self::assertSame('1', $query['showPlaces']);
        self::assertSame('0', $query['showAdditionalFacts']);

        self::assertArrayHasKey('xref', $query);
        self::assertArrayHasKey('tree', $query);
        self::assertSame('I1', $query['xref']);
        self::assertSame('main', $query['tree']);
    }
}
