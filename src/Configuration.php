<?php

/**
 * This file is part of the package magicsunday/webtrees-pedigree-chart.
 *
 * For the full copyright and license information, please read the
 * LICENSE file that was distributed with this source code.
 */

declare(strict_types=1);

namespace MagicSunday\Webtrees\PedigreeChart;

use Fig\Http\Message\RequestMethodInterface;
use Fisharebest\Webtrees\I18N;
use Fisharebest\Webtrees\Module\AbstractModule;
use Fisharebest\Webtrees\Module\PedigreeChartModule;
use Fisharebest\Webtrees\Validator;
use MagicSunday\Webtrees\ModuleBase\Model\NameAbbreviation;
use Psr\Http\Message\ServerRequestInterface;

/**
 * Configuration class.
 *
 * @author  Rico Sonntag <mail@ricosonntag.de>
 * @license https://opensource.org/licenses/GPL-3.0 GNU General Public License v3.0
 * @link    https://github.com/magicsunday/webtrees-pedigree-chart/
 */
class Configuration
{
    /**
     * Tree layout variants.
     *
     * @see PedigreeChartModule
     */
    public const LAYOUT_TOPBOTTOM = PedigreeChartModule::STYLE_DOWN;

    public const LAYOUT_BOTTOMTOP = PedigreeChartModule::STYLE_UP;

    public const LAYOUT_LEFTRIGHT = PedigreeChartModule::STYLE_RIGHT;

    public const LAYOUT_RIGHTLEFT = PedigreeChartModule::STYLE_LEFT;

    /**
     * The default number of generations to display.
     *
     * @var int
     */
    public const DEFAULT_GENERATIONS = 4;

    /**
     * Minimum number of displayable generations.
     *
     * @var int
     */
    public const MIN_GENERATIONS = 2;

    /**
     * Maximum number of displayable generations.
     *
     * @var int
     */
    public const MAX_GENERATIONS = 25;

    /**
     * Tree layout.
     *
     * @var string
     */
    public const DEFAULT_TREE_LAYOUT = self::LAYOUT_LEFTRIGHT;

    /**
     * Default base color for the paternal lineage (hex).
     */
    public const string PATERNAL_COLOR_DEFAULT = '#70a9cf';

    /**
     * Default base color for the maternal lineage (hex).
     */
    public const string MATERNAL_COLOR_DEFAULT = '#d06f94';

    /**
     * Configuration constructor.
     *
     * @param ServerRequestInterface $request
     * @param AbstractModule         $module
     */
    public function __construct(
        /**
         * The current request instance.
         */
        private readonly ServerRequestInterface $request,
        private readonly AbstractModule $module,
    ) {
    }

    /**
     * Returns the number of generations to display.
     *
     * @return int
     */
    public function getGenerations(): int
    {
        if ($this->request->getMethod() === RequestMethodInterface::METHOD_POST) {
            $validator = Validator::parsedBody($this->request);
        } else {
            $validator = Validator::queryParams($this->request);
        }

        return $validator
            ->isBetween(self::MIN_GENERATIONS, self::MAX_GENERATIONS)
            ->integer(
                'generations',
                (int) $this->module->getPreference(
                    'default_generations',
                    (string) self::DEFAULT_GENERATIONS
                )
            );
    }

    /**
     * Returns a list of possible selectable generations.
     *
     * @return string[]
     */
    public function getGenerationsList(): array
    {
        $result = [];

        foreach (range(self::MIN_GENERATIONS, self::MAX_GENERATIONS) as $value) {
            $result[$value] = I18N::number($value);
        }

        return $result;
    }

    /**
     * Returns whether to show empty boxes or not.
     *
     * @return bool
     */
    public function getShowEmptyBoxes(): bool
    {
        if ($this->request->getMethod() === RequestMethodInterface::METHOD_POST) {
            $validator = Validator::parsedBody($this->request);
        } else {
            $validator = Validator::queryParams($this->request);
        }

        return $validator
            ->boolean(
                'showEmptyBoxes',
                (bool) $this->module->getPreference(
                    'default_showEmptyBoxes',
                    '0'
                )
            );
    }

    /**
     * Returns the tree layout.
     *
     * @return string
     */
    public function getLayout(): string
    {
        if ($this->request->getMethod() === RequestMethodInterface::METHOD_POST) {
            $validator = Validator::parsedBody($this->request);
        } else {
            $validator = Validator::queryParams($this->request);
        }

        return $validator
            ->isInArray([
                self::LAYOUT_BOTTOMTOP,
                self::LAYOUT_LEFTRIGHT,
                self::LAYOUT_RIGHTLEFT,
                self::LAYOUT_TOPBOTTOM,
            ])
            ->string(
                'layout',
                $this->module->getPreference(
                    'default_layout',
                    self::DEFAULT_TREE_LAYOUT
                )
            );
    }

    /**
     * Returns the available tree layouts.
     *
     * @return string[]
     */
    public function getLayouts(): array
    {
        if (I18N::direction() === 'rtl') {
            return [
                self::LAYOUT_LEFTRIGHT => view('icons/pedigree-left') . I18N::translate('left'),
                self::LAYOUT_RIGHTLEFT => view('icons/pedigree-right') . I18N::translate('right'),
                self::LAYOUT_BOTTOMTOP => view('icons/pedigree-up') . I18N::translate('up'),
                self::LAYOUT_TOPBOTTOM => view('icons/pedigree-down') . I18N::translate('down'),
            ];
        }

        return [
            self::LAYOUT_RIGHTLEFT => view('icons/pedigree-left') . I18N::translate('left'),
            self::LAYOUT_LEFTRIGHT => view('icons/pedigree-right') . I18N::translate('right'),
            self::LAYOUT_BOTTOMTOP => view('icons/pedigree-up') . I18N::translate('up'),
            self::LAYOUT_TOPBOTTOM => view('icons/pedigree-down') . I18N::translate('down'),
        ];
    }

    /**
     * Returns whether to open a new browser window/tab on left-click on an individual or not.
     *
     * @return bool
     */
    public function getOpenNewTabOnClick(): bool
    {
        if ($this->request->getMethod() === RequestMethodInterface::METHOD_POST) {
            $validator = Validator::parsedBody($this->request);
        } else {
            $validator = Validator::queryParams($this->request);
        }

        return $validator
            ->boolean(
                'openNewTabOnClick',
                (bool) $this->module->getPreference(
                    'default_openNewTabOnClick',
                    '1'
                )
            );
    }

    /**
     * Returns true when the legacy GEDCOM `2 NICK` value should be displayed in
     * quotes between the given names and the surname (e.g. `Martin "Chalky" White`).
     * Default off so existing trees keep the post-2.0 webtrees rendering.
     *
     * @return bool
     */
    public function getShowNicknames(): bool
    {
        if ($this->request->getMethod() === RequestMethodInterface::METHOD_POST) {
            $validator = Validator::parsedBody($this->request);
        } else {
            $validator = Validator::queryParams($this->request);
        }

        return $validator
            ->boolean(
                'showNicknames',
                (bool) $this->module->getPreference(
                    'default_showNicknames',
                    '0'
                )
            );
    }

    /**
     * Returns whether to show the alternative name of an individual or not.
     *
     * @return bool
     */
    public function getShowAlternativeName(): bool
    {
        if ($this->request->getMethod() === RequestMethodInterface::METHOD_POST) {
            $validator = Validator::parsedBody($this->request);
        } else {
            $validator = Validator::queryParams($this->request);
        }

        return $validator
            ->boolean(
                'showAlternativeName',
                (bool) $this->module->getPreference(
                    'default_showAlternativeName',
                    '1'
                )
            );
    }

    /**
     * Returns whether to hide the SVG export button or not.
     *
     * @return bool
     */
    public function getHideSvgExport(): bool
    {
        if ($this->request->getMethod() === RequestMethodInterface::METHOD_POST) {
            $validator = Validator::parsedBody($this->request);
        } else {
            $validator = Validator::queryParams($this->request);
        }

        return $validator
            ->boolean(
                'hideSvgExport',
                (bool) $this->module->getPreference(
                    'default_hideSvgExport',
                    '0'
                )
            );
    }

    /**
     * Returns whether to hide the PNG export button or not.
     *
     * @return bool
     */
    public function getHidePngExport(): bool
    {
        if ($this->request->getMethod() === RequestMethodInterface::METHOD_POST) {
            $validator = Validator::parsedBody($this->request);
        } else {
            $validator = Validator::queryParams($this->request);
        }

        return $validator
            ->boolean(
                'hidePngExport',
                (bool) $this->module->getPreference(
                    'default_hidePngExport',
                    '0'
                )
            );
    }

    /**
     * Returns whether to color person boxes by paternal/maternal lineage.
     *
     * @return bool
     */
    public function getShowFamilyColors(): bool
    {
        if ($this->request->getMethod() === RequestMethodInterface::METHOD_POST) {
            $validator = Validator::parsedBody($this->request);
        } else {
            $validator = Validator::queryParams($this->request);
        }

        return $validator
            ->boolean(
                'showFamilyColors',
                (bool) $this->module->getPreference(
                    'default_showFamilyColors',
                    '1'
                )
            );
    }

    /**
     * Returns the CSS hex color used to tint paternal-side person boxes.
     *
     * @return string
     */
    public function getPaternalColor(): string
    {
        if ($this->request->getMethod() === RequestMethodInterface::METHOD_POST) {
            $validator = Validator::parsedBody($this->request);
        } else {
            $validator = Validator::queryParams($this->request);
        }

        return $validator
            ->string(
                'paternalColor',
                $this->module->getPreference(
                    'default_paternalColor',
                    self::PATERNAL_COLOR_DEFAULT
                )
            );
    }

    /**
     * Returns the CSS hex color used to tint maternal-side person boxes.
     *
     * @return string
     */
    public function getMaternalColor(): string
    {
        if ($this->request->getMethod() === RequestMethodInterface::METHOD_POST) {
            $validator = Validator::parsedBody($this->request);
        } else {
            $validator = Validator::queryParams($this->request);
        }

        return $validator
            ->string(
                'maternalColor',
                $this->module->getPreference(
                    'default_maternalColor',
                    self::MATERNAL_COLOR_DEFAULT
                )
            );
    }

    /**
     * Returns the dropdown options for the name-abbreviation strategy in
     * the admin config form. Keyed by the persisted enum value.
     *
     * @return array<string, string>
     */
    public function getNameAbbreviationList(): array
    {
        return [
            NameAbbreviation::AUTO    => I18N::translate("Automatic (based on tree's surname tradition)"),
            NameAbbreviation::GIVEN   => I18N::translate('Abbreviate given names first'),
            NameAbbreviation::SURNAME => I18N::translate('Abbreviate surnames first'),
        ];
    }

    /**
     * Returns the name-abbreviation strategy as stored. One of
     * {@see NameAbbreviation::AUTO}, GIVEN or SURNAME. The chart-render path
     * resolves AUTO to GIVEN/SURNAME via the tree's SURNAME_TRADITION before
     * serialising to the JS config — see {@see Module::getChartParameters()}.
     *
     * @return string
     */
    public function getNameAbbreviation(): string
    {
        if ($this->request->getMethod() === RequestMethodInterface::METHOD_POST) {
            $validator = Validator::parsedBody($this->request);
        } else {
            $validator = Validator::queryParams($this->request);
        }

        $value = $validator
            ->string(
                'nameAbbreviation',
                $this->module->getPreference(
                    'default_nameAbbreviation',
                    NameAbbreviation::AUTO
                )
            );

        return in_array($value, NameAbbreviation::CHOICES, true)
            ? $value
            : NameAbbreviation::AUTO;
    }
}
