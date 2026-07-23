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
use Fisharebest\Webtrees\Module\AbstractModule;
use Fisharebest\Webtrees\Services\ChartService;
use GuzzleHttp\Psr7\ServerRequest;
use Illuminate\Database\Schema\Blueprint;
use MagicSunday\Webtrees\ModuleBase\Model\NameAbbreviation;
use MagicSunday\Webtrees\PedigreeChart\Configuration;
use MagicSunday\Webtrees\PedigreeChart\Facade\DataFacade;
use MagicSunday\Webtrees\PedigreeChart\Module;
use PHPUnit\Framework\Attributes\CoversClass;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\TestCase;
use ReflectionProperty;

/**
 * Verifies which settings travel with the re-centering URL and that each one is
 * resolved from the request or, failing that, from the module preference.
 *
 * Uses an in-memory SQLite DB because AbstractModule::getPreference() is final
 * and cannot be stubbed; the real implementation reads from the
 * `module_setting` table.
 */
#[CoversClass(Configuration::class)]
final class ConfigurationTest extends TestCase
{
    /**
     * Boots an in-memory SQLite + minimal `module_setting` schema once per
     * process; subsequent calls just truncate the table and re-seed.
     *
     * @param array<string, string> $preferences
     */
    private function createModuleWithPreferences(array $preferences): Module
    {
        static $initialised = false;

        if ($initialised === false) {
            $database = new DB();
            $database->addConnection([
                'driver'   => 'sqlite',
                'database' => ':memory:',
            ]);
            $database->setAsGlobal();
            $database->bootEloquent();
            DB::connection()->getSchemaBuilder()->create('module_setting', static function (Blueprint $table): void {
                $table->string('module_name');
                $table->string('setting_name');
                $table->string('setting_value');
            });

            $initialised = true;
        }

        DB::table('module_setting')->delete();

        if ($preferences !== []) {
            DB::table('module_setting')->insert(
                array_map(
                    static fn (string $name, string $value): array => [
                        'module_name'   => 'webtrees-pedigree-chart',
                        'setting_name'  => $name,
                        'setting_value' => $value,
                    ],
                    array_keys($preferences),
                    array_values($preferences),
                )
            );
        }

        $chartService = self::createStub(ChartService::class);
        $module       = new Module($chartService, new DataFacade());

        $reflection = new ReflectionProperty(AbstractModule::class, 'name');
        $reflection->setValue($module, 'webtrees-pedigree-chart');

        return $module;
    }

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
                'generations'        => '5',
                'layout'             => Configuration::LAYOUT_TOPBOTTOM,
                'showNicknames'      => '1',
                'showAddParentLinks' => '1',
            ],
            []
        );

        self::assertSame(
            [
                'generations'        => 5,
                'layout'             => Configuration::LAYOUT_TOPBOTTOM,
                'showNicknames'      => '1',
                'showAddParentLinks' => '1',
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
                'generations'        => '3',
                'layout'             => Configuration::LAYOUT_LEFTRIGHT,
                'showNicknames'      => '0',
                'showAddParentLinks' => '0',
            ],
            []
        );

        self::assertSame(
            [
                'generations'        => 3,
                'layout'             => Configuration::LAYOUT_LEFTRIGHT,
                'showNicknames'      => '0',
                'showAddParentLinks' => '0',
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
                'default_generations'        => '7',
                'default_layout'             => Configuration::LAYOUT_RIGHTLEFT,
                'default_showNicknames'      => '1',
                'default_showAddParentLinks' => '1',
            ]
        );

        self::assertSame(
            [
                'generations'        => 7,
                'layout'             => Configuration::LAYOUT_RIGHTLEFT,
                'showNicknames'      => '1',
                'showAddParentLinks' => '1',
            ],
            $configuration->getRouteToggleParams()
        );
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
     * {@see \MagicSunday\Webtrees\PedigreeChart\Traits\ModuleConfigTrait::postAdminAction()}
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
}
