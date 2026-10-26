<?php

/**
 * This file is part of the package magicsunday/webtrees-pedigree-chart.
 *
 * For the full copyright and license information, please read the
 * LICENSE file that was distributed with this source code.
 */

declare(strict_types=1);

namespace MagicSunday\Webtrees\PedigreeChart\Test;

use Fig\Http\Message\RequestMethodInterface;
use Fisharebest\Webtrees\DB;
use Fisharebest\Webtrees\Tree;
use GuzzleHttp\Psr7\ServerRequest;
use MagicSunday\Webtrees\ModuleBase\Model\NameAbbreviation;
use MagicSunday\Webtrees\ModuleBase\Model\PlaceFormatChoice;
use MagicSunday\Webtrees\ModuleBase\Model\PlaceStyle;
use MagicSunday\Webtrees\PedigreeChart\Configuration;
use MagicSunday\Webtrees\PedigreeChart\Module;
use MagicSunday\Webtrees\PedigreeChart\Test\Support\EnglishLocaleFixture;
use MagicSunday\Webtrees\PedigreeChart\Test\Support\ModuleSettingsFixtureTrait;
use PHPUnit\Framework\Attributes\CoversClass;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\Attributes\UsesClass;
use PHPUnit\Framework\TestCase;

/**
 * Verifies which settings travel with the re-centering URL and that each one is
 * resolved from the request or, failing that, from the module preference.
 *
 * Uses an in-memory SQLite DB because AbstractModule::getPreference() is final
 * and cannot be stubbed; the real implementation reads from the
 * `module_setting` table.
 */
#[CoversClass(Configuration::class)]
#[UsesClass(Module::class)]
final class ConfigurationTest extends TestCase
{
    use ModuleSettingsFixtureTrait;

    /**
     * Builds a Configuration from the given query parameters and seeded module
     * preferences.
     *
     * @param array<string, string> $queryParams
     * @param array<string, string> $preferences
     */
    private function buildConfiguration(array $queryParams, array $preferences): Configuration
    {
        $request = (new ServerRequest(RequestMethodInterface::METHOD_GET, '/'))
            ->withQueryParams($queryParams);

        return new Configuration($request, $this->createModuleWithPreferences($preferences));
    }

    /**
     * The enabled polarity. The boolean settings have to leave as the strings
     * `'1'`/`'0'`, because `Validator::boolean()` compares strictly — an int
     * would match neither branch and fall back to the preference default, which
     * is the very regression this list prevents.
     */
    #[Test]
    public function routeParamsCarryTheEnabledDisplaySettings(): void
    {
        $configuration = $this->buildConfiguration(
            [
                'generations'         => '5',
                'layout'              => Configuration::LAYOUT_TOPBOTTOM,
                'openNewTabOnClick'   => '1',
                'showAlternativeName' => '1',
                'showNicknames'       => '1',
                'showFamilyColors'    => '1',
                'paternalColor'       => '#112233',
                'maternalColor'       => '#445566',
                'showAddParentLinks'  => '1',
                'showPlaces'          => '1',
                'showAdditionalFacts' => '1',
            ],
            []
        );

        self::assertSame(
            [
                'generations'         => 5,
                'layout'              => Configuration::LAYOUT_TOPBOTTOM,
                'openNewTabOnClick'   => '1',
                'showAlternativeName' => '1',
                'showNicknames'       => '1',
                'showFamilyColors'    => '1',
                'paternalColor'       => '#112233',
                'maternalColor'       => '#445566',
                'showAddParentLinks'  => '1',
                'showPlaces'          => '1',
                'showAdditionalFacts' => '1',
            ],
            $configuration->getRouteToggleParams()
        );
    }

    /**
     * Locks the false → '0' branch of the boolean mapping, which the enabled
     * case cannot: a regression that hardcodes '1', leaves a toggle stuck on, or
     * lets it fall through to an enabled default passes the enabled case above
     * but must fail here.
     */
    #[Test]
    public function routeParamsCarryTheDisabledDisplaySettings(): void
    {
        $configuration = $this->buildConfiguration(
            [
                'generations'         => '3',
                'layout'              => Configuration::LAYOUT_LEFTRIGHT,
                'openNewTabOnClick'   => '0',
                'showAlternativeName' => '0',
                'showNicknames'       => '0',
                'showFamilyColors'    => '0',
                'paternalColor'       => '#aabbcc',
                'maternalColor'       => '#ddeeff',
                'showAddParentLinks'  => '0',
                'showPlaces'          => '0',
                'showAdditionalFacts' => '0',
            ],
            []
        );

        self::assertSame(
            [
                'generations'         => 3,
                'layout'              => Configuration::LAYOUT_LEFTRIGHT,
                'openNewTabOnClick'   => '0',
                'showAlternativeName' => '0',
                'showNicknames'       => '0',
                'showFamilyColors'    => '0',
                'paternalColor'       => '#aabbcc',
                'maternalColor'       => '#ddeeff',
                'showAddParentLinks'  => '0',
                'showPlaces'          => '0',
                'showAdditionalFacts' => '0',
            ],
            $configuration->getRouteToggleParams()
        );
    }

    /**
     * The scenario the forwarding exists for: without any request parameter the
     * effective value is the module preference, and that resolved value — not an
     * echo of the URL — is what has to travel on.
     */
    #[Test]
    public function routeParamsResolveFromModulePreferencesWhenTheRequestIsEmpty(): void
    {
        $configuration = $this->buildConfiguration(
            [],
            [
                'default_generations'         => '7',
                'default_layout'              => Configuration::LAYOUT_RIGHTLEFT,
                'default_openNewTabOnClick'   => '0',
                'default_showAlternativeName' => '1',
                'default_showNicknames'       => '1',
                'default_showFamilyColors'    => '0',
                'default_paternalColor'       => '#010203',
                'default_maternalColor'       => '#040506',
                'default_showAddParentLinks'  => '1',
                'default_showPlaces'          => '1',
                'default_showAdditionalFacts' => '0',
            ]
        );

        self::assertSame(
            [
                'generations'         => 7,
                'layout'              => Configuration::LAYOUT_RIGHTLEFT,
                'openNewTabOnClick'   => '0',
                'showAlternativeName' => '1',
                'showNicknames'       => '1',
                'showFamilyColors'    => '0',
                'paternalColor'       => '#010203',
                'maternalColor'       => '#040506',
                'showAddParentLinks'  => '1',
                'showPlaces'          => '1',
                'showAdditionalFacts' => '0',
            ],
            $configuration->getRouteToggleParams()
        );
    }

    /**
     * Values that are not a six digit hex colour, among them the opener of an
     * HTML comment followed by a script opener that an inline script would
     * keep intact after JSON encoding.
     *
     * @return array<string, array{string}>
     */
    public static function invalidColourProvider(): array
    {
        return [
            'comment and script opener' => ['<!--<script>'],
            'missing hash'              => ['112233'],
            'short form'                => ['#123'],
            'non-hex digit'             => ['#11223g'],
            'trailing declaration'      => ['#112233;color:red'],
            'trailing line break'       => ["#112233\n"],
            'leading text'              => ['x#112233'],
            'surrounding space'         => [' #112233 '],
            'empty'                     => [''],
        ];
    }

    /**
     * A request value that is no hex colour never reaches the page. Both
     * lineage colours resolve to their defaults instead.
     */
    #[Test]
    #[DataProvider('invalidColourProvider')]
    public function aColourFromTheRequestThatIsNoHexColourFallsBackToTheDefault(string $value): void
    {
        $configuration = $this->buildConfiguration(
            [
                'paternalColor' => $value,
                'maternalColor' => $value,
            ],
            []
        );

        self::assertSame(Configuration::PATERNAL_COLOR_DEFAULT, $configuration->getPaternalColor());
        self::assertSame(Configuration::MATERNAL_COLOR_DEFAULT, $configuration->getMaternalColor());
    }

    /**
     * A module preference that is no hex colour is ignored the same way, so
     * the stored value cannot reach the page either.
     */
    #[Test]
    #[DataProvider('invalidColourProvider')]
    public function aColourFromTheModulePreferenceThatIsNoHexColourFallsBackToTheDefault(string $value): void
    {
        $configuration = $this->buildConfiguration(
            [],
            [
                'default_paternalColor' => $value,
                'default_maternalColor' => $value,
            ]
        );

        self::assertSame(Configuration::PATERNAL_COLOR_DEFAULT, $configuration->getPaternalColor());
        self::assertSame(Configuration::MATERNAL_COLOR_DEFAULT, $configuration->getMaternalColor());
    }

    /**
     * A valid colour of the request wins over the module preference, and the
     * letters of the digits keep their case.
     */
    #[Test]
    public function aHexColourFromTheRequestWinsOverTheModulePreference(): void
    {
        $configuration = $this->buildConfiguration(
            [
                'paternalColor' => '#AbCdEf',
                'maternalColor' => '#fEdCbA',
            ],
            [
                'default_paternalColor' => '#010203',
                'default_maternalColor' => '#040506',
            ]
        );

        self::assertSame('#AbCdEf', $configuration->getPaternalColor());
        self::assertSame('#fEdCbA', $configuration->getMaternalColor());
    }

    /**
     * A request value that is no hex colour falls back to the stored module
     * preference when that one is valid, not to the built-in default.
     */
    #[Test]
    public function aColourFromTheRequestThatIsNoHexColourFallsBackToTheValidModulePreference(): void
    {
        $configuration = $this->buildConfiguration(
            [
                'paternalColor' => '<!--<script>',
                'maternalColor' => '#11223g',
            ],
            [
                'default_paternalColor' => '#010203',
                'default_maternalColor' => '#040506',
            ]
        );

        self::assertSame('#010203', $configuration->getPaternalColor());
        self::assertSame('#040506', $configuration->getMaternalColor());
    }

    /**
     * The name-abbreviation strategy is resolved to a typed {@see NameAbbreviation}
     * case: a request parameter wins, then the module preference. An unknown or
     * stale value falls back to {@see NameAbbreviation::Auto} instead of leaking
     * through unchanged — the guarantee the enum boundary exists to provide, and
     * which the previous string-in/string-out shape did not enforce.
     *
     * @param array<string, string> $queryParams
     * @param array<string, string> $preferences
     */
    #[Test]
    #[DataProvider('nameAbbreviationProvider')]
    public function nameAbbreviationResolvesToATypedCase(
        array $queryParams,
        array $preferences,
        NameAbbreviation $expected,
    ): void {
        $configuration = $this->buildConfiguration($queryParams, $preferences);

        self::assertSame($expected, $configuration->getNameAbbreviation());
    }

    /**
     * The persisting path is POST:
     * {@see Module\ConfigTrait::postAdminAction()}
     * reads the value from the request body, so the POST branch of
     * getNameAbbreviation() (Validator::parsedBody) must resolve the same way as
     * the GET branch — the request body wins over the module preference. A
     * regression that read query parameters under POST would fall through to the
     * SURNAME preference and fail here.
     */
    #[Test]
    public function nameAbbreviationResolvesFromThePostBody(): void
    {
        $request = (new ServerRequest(RequestMethodInterface::METHOD_POST, '/'))
            ->withParsedBody(['nameAbbreviation' => 'GIVEN']);

        $configuration = new Configuration(
            $request,
            $this->createModuleWithPreferences(['default_nameAbbreviation' => 'SURNAME'])
        );

        self::assertSame(NameAbbreviation::Given, $configuration->getNameAbbreviation());
    }

    /**
     * Request/preference combinations paired with the strategy case each one
     * resolves to.
     *
     * @return array<string, array{array<string, string>, array<string, string>, NameAbbreviation}>
     */
    public static function nameAbbreviationProvider(): array
    {
        return [
            'request value wins over the preference' => [
                ['nameAbbreviation' => 'GIVEN'],
                ['default_nameAbbreviation' => 'SURNAME'],
                NameAbbreviation::Given,
            ],
            'request surname' => [
                ['nameAbbreviation' => 'SURNAME'],
                [],
                NameAbbreviation::Surname,
            ],
            'unknown request value falls back to Auto' => [
                ['nameAbbreviation' => 'not-a-strategy'],
                [],
                NameAbbreviation::Auto,
            ],
            'module preference when the request is empty' => [
                [],
                ['default_nameAbbreviation' => 'SURNAME'],
                NameAbbreviation::Surname,
            ],
            'stale persisted preference falls back to Auto' => [
                [],
                ['default_nameAbbreviation' => 'a-removed-strategy'],
                NameAbbreviation::Auto,
            ],
            'default is Auto without request or preference' => [
                [],
                [],
                NameAbbreviation::Auto,
            ],
        ];
    }

    /**
     * The place switch is off until the request or the administrator turns it on,
     * and the request wins over the module preference in both directions.
     *
     * @param array<string, string> $queryParams
     * @param array<string, string> $preferences
     */
    #[Test]
    #[DataProvider('showPlacesProvider')]
    public function showPlacesResolvesFromTheRequestThenThePreference(
        array $queryParams,
        array $preferences,
        bool $expected,
    ): void {
        self::assertSame($expected, $this->buildConfiguration($queryParams, $preferences)->getShowPlaces());
    }

    /**
     * @return array<string, array{array<string, string>, array<string, string>, bool}>
     */
    public static function showPlacesProvider(): array
    {
        return [
            'off without request or preference' => [[], [], false],
            'on by the administrator'           => [[], ['default_showPlaces' => '1'], true],
            'request switches it on'            => [['showPlaces' => '1'], [], true],
            'request switches it off'           => [['showPlaces' => '0'], ['default_showPlaces' => '1'], false],
        ];
    }

    /**
     * The additional facts are on until the request or the administrator turns
     * them off. The chart shows none unless the tree names tags for the chart
     * box, so the default changes nothing for a tree that names none.
     *
     * @param array<string, string> $queryParams
     * @param array<string, string> $preferences
     */
    #[Test]
    #[DataProvider('showAdditionalFactsProvider')]
    public function showAdditionalFactsResolvesFromTheRequestThenThePreference(
        array $queryParams,
        array $preferences,
        bool $expected,
    ): void {
        self::assertSame(
            $expected,
            $this->buildConfiguration($queryParams, $preferences)->getShowAdditionalFacts()
        );
    }

    /**
     * @return array<string, array{array<string, string>, array<string, string>, bool}>
     */
    public static function showAdditionalFactsProvider(): array
    {
        return [
            'on without request or preference' => [[], [], true],
            'off by the administrator'         => [[], ['default_showAdditionalFacts' => '0'], false],
            'request switches it off'          => [['showAdditionalFacts' => '0'], [], false],
            'request switches it on'           => [['showAdditionalFacts' => '1'], ['default_showAdditionalFacts' => '0'], true],
        ];
    }

    /**
     * The place format is an administrator choice. The chart reads the stored
     * preference only, so a request value never replaces it and a stored value
     * that is no choice falls back to the automatic one.
     *
     * @param array<string, string> $queryParams
     * @param array<string, string> $preferences
     */
    #[Test]
    #[DataProvider('placeFormatChoiceProvider')]
    public function placeFormatChoiceComesFromTheStoredPreferenceOnly(
        array $queryParams,
        array $preferences,
        PlaceFormatChoice $expected,
    ): void {
        self::assertSame(
            $expected,
            $this->buildConfiguration($queryParams, $preferences)->getPlaceFormatChoice()
        );
    }

    /**
     * @return array<string, array{array<string, string>, array<string, string>, PlaceFormatChoice}>
     */
    public static function placeFormatChoiceProvider(): array
    {
        return [
            'automatic without request or preference'       => [[], [], PlaceFormatChoice::Automatic],
            'stored preference'                             => [[], ['default_placeFormat' => 'levels-2'], PlaceFormatChoice::Levels2],
            'a request value never replaces the preference' => [['placeFormat' => 'full'], ['default_placeFormat' => 'levels-2'], PlaceFormatChoice::Levels2],
            'a request value never replaces the default'    => [['placeFormat' => 'full'], [], PlaceFormatChoice::Automatic],
            'unknown preference falls back'                 => [[], ['default_placeFormat' => 'nonsense'], PlaceFormatChoice::Automatic],
        ];
    }

    /**
     * A visitor adds a place format to the address of the chart. The places of
     * the chart keep the format that the administrator stored.
     */
    #[Test]
    public function aVisitorCannotChangeThePlaceFormatOfTheChart(): void
    {
        $configuration = $this->buildConfiguration(
            ['placeFormat' => 'full'],
            ['default_placeFormat' => 'levels-1']
        );

        self::assertEquals(PlaceFormatChoice::Levels1->toSpec(1, false), $configuration->getPlaceFormat());
    }

    /**
     * The save of the administration form reads the submitted choice. A value
     * that is no choice keeps the stored one.
     *
     * @param array<string, string> $body
     * @param array<string, string> $preferences
     */
    #[Test]
    #[DataProvider('submittedPlaceFormatChoiceProvider')]
    public function theSubmittedFormSelectsThePlaceFormat(
        array $body,
        array $preferences,
        PlaceFormatChoice $expected,
    ): void {
        $request = (new ServerRequest(RequestMethodInterface::METHOD_POST, '/'))
            ->withParsedBody($body);

        $configuration = new Configuration($request, $this->createModuleWithPreferences($preferences));

        self::assertSame($expected, $configuration->getSubmittedPlaceFormatChoice());
    }

    /**
     * @return array<string, array{array<string, string>, array<string, string>, PlaceFormatChoice}>
     */
    public static function submittedPlaceFormatChoiceProvider(): array
    {
        return [
            'a submitted choice wins over the stored one'  => [['placeFormat' => 'full'], ['default_placeFormat' => 'levels-2'], PlaceFormatChoice::Full],
            'an unknown submitted value keeps the stored'  => [['placeFormat' => 'nonsense'], ['default_placeFormat' => 'levels-3'], PlaceFormatChoice::Levels3],
            'nothing submitted keeps the stored one'       => [[], ['default_placeFormat' => 'levels-2'], PlaceFormatChoice::Levels2],
            'nothing submitted and stored gives automatic' => [[], [], PlaceFormatChoice::Automatic],
        ];
    }

    /**
     * Automatic resolves against the tree preferences, and against the right
     * ones. Swapping the level count with its suffix sibling must fail this.
     */
    #[Test]
    public function automaticResolvesTheTreePreferencesIntoASpec(): void
    {
        $tree = self::createStub(Tree::class);
        // Two-element rows: getPreference() is called with one argument and the
        // value map matches on the arguments actually passed.
        $tree->method('getPreference')->willReturnMap([
            ['SHOW_PEDIGREE_PLACES', '2'],
            ['SHOW_PEDIGREE_PLACES_SUFFIX', '1'],
        ]);

        $configuration = new Configuration(
            new ServerRequest(RequestMethodInterface::METHOD_GET, '/'),
            $this->createModuleWithPreferences([]),
            $tree
        );
        $spec = $configuration->getPlaceFormat();

        self::assertSame(PlaceStyle::Levels, $spec->style);
        self::assertSame(2, $spec->levels);
        self::assertTrue($spec->fromEnd);
    }

    /**
     * The admin page has no tree. Automatic then shows the lowest level only.
     */
    #[Test]
    public function automaticWithoutATreeFallsBackToOneLevel(): void
    {
        $spec = $this->buildConfiguration([], [])->getPlaceFormat();

        self::assertSame(PlaceStyle::Levels, $spec->style);
        self::assertSame(1, $spec->levels);
        self::assertFalse($spec->fromEnd);
    }

    /**
     * An explicit choice ignores the suffix preference of the tree, the module
     * has no direction control of its own.
     */
    #[Test]
    public function anExplicitChoiceIgnoresTheTreeSuffix(): void
    {
        $tree = self::createStub(Tree::class);
        $tree->method('getPreference')->willReturnMap([
            ['SHOW_PEDIGREE_PLACES', '2'],
            ['SHOW_PEDIGREE_PLACES_SUFFIX', '1'],
        ]);

        $configuration = new Configuration(
            new ServerRequest(RequestMethodInterface::METHOD_GET, '/'),
            $this->createModuleWithPreferences(['default_placeFormat' => 'levels-3']),
            $tree
        );
        $spec = $configuration->getPlaceFormat();

        self::assertSame(PlaceStyle::Levels, $spec->style);
        self::assertSame(3, $spec->levels);
        self::assertFalse($spec->fromEnd);
    }

    /**
     * Every choice has a label, and every label key round-trips through
     * tryFrom(), otherwise a select option silently fails to store.
     */
    #[Test]
    public function everyPlaceFormatChoiceHasALabelKeyedByItsStoredValue(): void
    {
        EnglishLocaleFixture::install();

        $list = $this->buildConfiguration([], [])->getPlaceFormatList();

        self::assertCount(count(PlaceFormatChoice::cases()), $list, 'one label per choice');

        foreach (PlaceFormatChoice::cases() as $choice) {
            self::assertArrayHasKey($choice->value, $list);
            self::assertNotSame('', $list[$choice->value]);
        }
    }

    /**
     * The place format is an administrator setting without a form field, so it
     * does not travel with the re-centering URL, like the name abbreviation.
     */
    #[Test]
    public function thePlaceFormatDoesNotTravelWithTheRouteParameters(): void
    {
        $params = $this->buildConfiguration(['placeFormat' => 'full'], [])->getRouteToggleParams();

        self::assertArrayNotHasKey('placeFormat', $params);
    }

    /**
     * Pins the per-request query cost: however often the getters are called
     * while the tree is built, each preference is read at most once.
     */
    #[Test]
    public function readsEachPreferenceOnceHoweverOftenTheGettersAreCalled(): void
    {
        // Compares one round against ten rather than asserting a fixed number.
        // A fixed bound would encode today's preference count and would fail on
        // an unrelated future addition while blaming memoisation. It would also
        // pass vacuously if the getters stopped querying at all. Constant cost
        // is the property that matters.
        $oneRound  = $this->countPreferenceQueries(1);
        $tenRounds = $this->countPreferenceQueries(10);

        self::assertGreaterThan(0, $oneRound, 'the first round must actually read the preferences');
        self::assertSame(
            $oneRound,
            $tenRounds,
            'preference lookups are not memoised, the query cost scales with the number of nodes'
        );
    }

    /**
     * Runs all per-node getters $rounds times against a FRESH configuration and
     * returns how many `module_setting` queries that produced. The instance has
     * to be fresh per measurement, reusing one would leave it memoised from the
     * previous round and report zero.
     */
    private function countPreferenceQueries(int $rounds): int
    {
        $configuration = $this->buildConfiguration([], []);
        $connection    = DB::connection();
        $connection->flushQueryLog();
        $connection->enableQueryLog();

        try {
            for ($i = 0; $i < $rounds; ++$i) {
                $configuration->getGenerations();
                $configuration->getLayout();
                $configuration->getOpenNewTabOnClick();
                $configuration->getShowNicknames();
                $configuration->getShowAlternativeName();
                $configuration->getHideSvgExport();
                $configuration->getHidePngExport();
                $configuration->getShowFamilyColors();
                $configuration->getPaternalColor();
                $configuration->getMaternalColor();
                $configuration->getShowAddParentLinks();
                $configuration->getNameAbbreviation();
                $configuration->getShowPlaces();
                $configuration->getShowAdditionalFacts();
                $configuration->getPlaceFormatChoice();
                $configuration->getPlaceFormat();
            }

            // Counts only the preference reads the assertion talks about, so an
            // unrelated query inside the window cannot change the verdict.
            return count(array_filter($connection->getQueryLog(), $this->isPreferenceQuery(...)));
        } finally {
            $connection->disableQueryLog();
            $connection->flushQueryLog();
        }
    }

    /**
     * Whether a query-log entry is a preference read.
     *
     * Declared as a named method with the log entry's shape rather than an
     * inline closure, because without the shape Rector wants a `(string)` cast
     * on the query and PHPStan rejects that same cast as useless.
     *
     * @param array{query: string, bindings: array<mixed>, time: float|null} $entry
     */
    private function isPreferenceQuery(array $entry): bool
    {
        return str_contains($entry['query'], 'module_setting');
    }
}
