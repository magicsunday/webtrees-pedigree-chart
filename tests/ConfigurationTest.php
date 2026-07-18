<?php

/**
 * This file is part of the package magicsunday/webtrees-pedigree-chart.
 *
 * For the full copyright and license information, please read the
 * LICENSE file that was distributed with this source code.
 */

declare(strict_types=1);

namespace MagicSunday\Webtrees\PedigreeChart\Test;

use Fisharebest\Webtrees\Module\AbstractModule;
use MagicSunday\Webtrees\PedigreeChart\Configuration;
use PHPUnit\Framework\Attributes\CoversClass;
use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\TestCase;
use Psr\Http\Message\ServerRequestInterface;

/**
 * Validates how the chart configuration assembles the parameters that survive
 * a chart re-centering request.
 */
#[CoversClass(Configuration::class)]
final class ConfigurationTest extends TestCase
{
    /**
     * The individual getters resolve request parameters against module
     * preferences, and `AbstractModule::getPreference()` is final and reads the
     * database, so exercising them needs a module backed by a real preference
     * store. This repository has no such harness yet; overriding the getters
     * keeps this test on the part that is actually under test, namely which
     * settings `getRouteToggleParams()` collects.
     *
     * Once a preference-backed harness exists, this should resolve the getters
     * for real so the parameter values are covered as well, not just the keys.
     *
     * @return Configuration
     */
    private function configurationWithFixedSettings(): Configuration
    {
        return new class(self::createStub(ServerRequestInterface::class), self::createStub(AbstractModule::class)) extends Configuration {
            public function getGenerations(): int
            {
                return 5;
            }

            public function getLayout(): string
            {
                return 'down';
            }

            public function getShowNicknames(): bool
            {
                return true;
            }

            public function getShowAddParentLinks(): bool
            {
                return false;
            }
        };
    }

    /**
     * The re-centering URL is rebuilt from these parameters. Every setting the
     * data facade reads while building node data has to appear here, otherwise
     * clicking a person silently resets it to the module preference default.
     */
    #[Test]
    public function routeToggleParamsCarryEverySettingTheFacadeReads(): void
    {
        $params = $this->configurationWithFixedSettings()->getRouteToggleParams();

        self::assertSame(
            [
                'generations'        => 5,
                'layout'             => 'down',
                'showNicknames'      => '1',
                'showAddParentLinks' => '0',
            ],
            $params
        );
    }
}
