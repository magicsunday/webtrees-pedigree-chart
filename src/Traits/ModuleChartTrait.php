<?php

/**
 * This file is part of the package magicsunday/webtrees-pedigree-chart.
 *
 * For the full copyright and license information, please read the
 * LICENSE file that was distributed with this source code.
 */

declare(strict_types=1);

namespace MagicSunday\Webtrees\PedigreeChart\Traits;

use Fisharebest\Webtrees\I18N;
use Fisharebest\Webtrees\Individual;
use MagicSunday\Webtrees\ModuleBase\Traits\ModuleChartTrait as BaseModuleChartTrait;

/**
 * Trait ModuleChartTrait.
 *
 * @author  Rico Sonntag <mail@ricosonntag.de>
 * @license https://opensource.org/licenses/GPL-3.0 GNU General Public License v3.0
 * @link    https://github.com/magicsunday/webtrees-pedigree-chart/
 */
trait ModuleChartTrait
{
    use BaseModuleChartTrait;

    public function chartMenuClass(): string
    {
        return 'menu-chart-pedigree';
    }

    public function chartTitle(Individual $individual): string
    {
        return I18N::translate('Pedigree chart of %s', $individual->fullName());
    }
}
