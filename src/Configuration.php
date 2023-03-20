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
     * @see \Fisharebest\Webtrees\Module\PedigreeChartModule
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
     * The calling module.
     */
    private AbstractModule $module;

    /**
     * The current request instance.
     *
     * @var ServerRequestInterface
     */
    private ServerRequestInterface $request;

    /**
     * Configuration constructor.
     *
     * @param ServerRequestInterface $request
     */
    public function __construct(ServerRequestInterface $request, AbstractModule $module)
    {
        $this->request = $request;
        $this->module = $module;
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
            ->integer('generations', (int) $this->module->getPreference('default_generations',
                (string) self::DEFAULT_GENERATIONS));
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
        return Validator::queryParams($this->request)
            ->boolean('showEmptyBoxes', false);
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
            ->isInArray([self::LAYOUT_BOTTOMTOP, self::LAYOUT_LEFTRIGHT, self::LAYOUT_RIGHTLEFT,
                self::LAYOUT_TOPBOTTOM])
            ->string('layout', $this->module->getPreference('default_tree_layout',
                self::DEFAULT_TREE_LAYOUT));
    }
}
