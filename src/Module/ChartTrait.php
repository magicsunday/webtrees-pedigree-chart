<?php

/**
 * This file is part of the package magicsunday/webtrees-pedigree-chart.
 *
 * For the full copyright and license information, please read the
 * LICENSE file that was distributed with this source code.
 */

declare(strict_types=1);

namespace MagicSunday\Webtrees\PedigreeChart\Module;

use Fisharebest\Webtrees\I18N;
use Fisharebest\Webtrees\Individual;
use MagicSunday\Webtrees\ModuleBase\Traits\ModuleChartTrait as BaseModuleChartTrait;

/**
 * Implements the webtrees ModuleChartInterface methods specific to the pedigree
 * chart: the menu CSS class, the chart title and the page title.
 *
 * @author  Rico Sonntag <mail@ricosonntag.de>
 * @license https://opensource.org/licenses/GPL-3.0 GNU General Public License v3.0
 * @link    https://github.com/magicsunday/webtrees-pedigree-chart/
 */
trait ChartTrait
{
    use BaseModuleChartTrait;

    /**
     * Returns the CSS class applied to the pedigree-chart menu item.
     *
     * This is not redundant with the core module. The trait imported above
     * brings in the core chart trait, whose empty value would take precedence
     * over the parent class method.
     */
    public function chartMenuClass(): string
    {
        return 'menu-chart-pedigree';
    }

    /**
     * Returns the localised chart title shown in the chart box menu and page
     * headings.
     */
    public function chartTitle(Individual $individual): string
    {
        return I18N::translate('Pedigree chart of %s', $individual->fullName());
    }

    /**
     * Returns the page title. It names the individual only when the visitor
     * may see the name, otherwise it is the plain chart title.
     *
     * @return string
     */
    public function pageTitle(Individual $individual): string
    {
        if ($individual->canShowName()) {
            return $this->chartTitle($individual);
        }

        return I18N::translate('Pedigree chart');
    }
}
