<?php

/**
 * This file is part of the package magicsunday/webtrees-pedigree-chart.
 *
 * For the full copyright and license information, please read the
 * LICENSE file that was distributed with this source code.
 */

declare(strict_types=1);

namespace MagicSunday\Webtrees\PedigreeChart\Test\Support;

use Fisharebest\Webtrees\Module\AbstractModule;
use Fisharebest\Webtrees\Services\ChartService;
use MagicSunday\Webtrees\ModuleBase\Testing\ModuleSettingsFixture;
use MagicSunday\Webtrees\PedigreeChart\Facade\DataFacade;
use MagicSunday\Webtrees\PedigreeChart\Module;
use ReflectionProperty;

/**
 * Provides a module whose preferences come from a real in-memory database.
 *
 * AbstractModule::getPreference() is final and cannot be stubbed, and the real
 * implementation reads from the `module_setting` table, which the shared
 * fixture of the module base provides as a minimal SQLite schema.
 */
trait ModuleSettingsFixtureTrait
{
    /**
     * Seeds the preferences into the in-memory `module_setting` table of the
     * shared fixture and builds the module on top of it.
     *
     * @param array<string, string> $preferences
     */
    private function createModuleWithPreferences(array $preferences): Module
    {
        ModuleSettingsFixture::seed('webtrees-pedigree-chart', $preferences);

        $chartService = self::createStub(ChartService::class);
        $module       = new Module($chartService, new DataFacade());

        $reflection = new ReflectionProperty(AbstractModule::class, 'name');
        $reflection->setValue($module, 'webtrees-pedigree-chart');

        return $module;
    }
}
