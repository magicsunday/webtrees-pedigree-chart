<?php

/**
 * See LICENSE.md file for further details.
 */

declare(strict_types=1);

namespace MagicSunday\Webtrees\PedigreeChart;

use Fisharebest\Webtrees\I18N;
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
     */
    public const LAYOUT_TOPBOTTOM = "top-to-bottom";
    public const LAYOUT_BOTTOMTOP = "bottom-to-top";
    public const LAYOUT_LEFTRIGHT = "left-to-right";
    public const LAYOUT_RIGHTLEFT = "right-to-left";

    /**
     * The default number of generations to display.
     *
     * @var int
     */
    private const DEFAULT_GENERATIONS = 4;

    /**
     * Minimum number of displayable generations.
     *
     * @var int
     */
    private const MIN_GENERATIONS = 2;

    /**
     * Maximum number of displayable generations.
     *
     * @var int
     */
    private const MAX_GENERATIONS = 25;

    /**
     * Tree layout.
     *
     * @var string
     */
    private const DEFAULT_TREE_LAYOUT = self::LAYOUT_LEFTRIGHT;

    /**
     * The current request instance.
     *
     * @var ServerRequestInterface
     */
    private $request;

    /**
     * Configuration constructor.
     *
     * @param ServerRequestInterface $request
     */
    public function __construct(ServerRequestInterface $request)
    {
        $this->request = $request;
    }

    /**
     * Returns the number of generations to display.
     *
     * @return int
     */
    public function getGenerations(): int
    {
        $generations = (int) ($this->request->getQueryParams()['generations'] ?? self::DEFAULT_GENERATIONS);
        $generations = min($generations, self::MAX_GENERATIONS);

        return max($generations, self::MIN_GENERATIONS);
    }

    /**
     * Returns a list of possible selectable generations.
     *
     * @return int[]
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
        return (bool) ($this->request->getQueryParams()['showEmptyBoxes'] ?? false);
    }

    /**
     * Returns the tree layout.
     *
     * @return string
     */
    public function getTreeLayout(): string
    {
        return $this->request->getQueryParams()['treeLayout'] ?? self::DEFAULT_TREE_LAYOUT;
    }

    /**
     * Returns TRUE if the show more button was selected otherwise FALSE.
     *
     * @return bool
     */
    public function getShowMore(): bool
    {
        return (bool) ($this->request->getQueryParams()['showMore'] ?? false);
    }
}
