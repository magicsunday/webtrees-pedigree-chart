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
use MagicSunday\Webtrees\PedigreeChart\Configuration;
use MagicSunday\Webtrees\PedigreeChart\Facade\DataFacade;
use MagicSunday\Webtrees\PedigreeChart\Module;
use PHPUnit\Framework\Attributes\CoversClass;
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
     * The disabled polarity, which the enabled case cannot discriminate: with
     * both toggles on, a raw passthrough of the query parameters would produce
     * the same result as the intended mapping.
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
}
