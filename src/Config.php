<?php
declare(strict_types=1);

/**
 * See LICENSE.md file for further details.
 */
namespace MagicSunday\Webtrees\PedigreeChart;

use Fisharebest\Webtrees\Tree;
use Symfony\Component\HttpFoundation\Request;

/**
 * Configuration class.
 *
 * @author  Rico Sonntag <mail@ricosonntag.de>
 * @license https://opensource.org/licenses/GPL-3.0 GNU General Public License v3.0
 * @link    https://github.com/magicsunday/ancestral-fan-chart/
 */
class Config
{
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
     * The current request instance.
     *
     * @var Request
     */
    private $request;

    /**
     * The current tree instance.
     *
     * @var Tree
     */
    private $tree;

    /**
     * Config constructor.
     *
     * @param Request $request The current HTTP request
     * @param Tree    $tree    The current tree
     */
    public function __construct(Request $request, Tree $tree)
    {
        $this->request = $request;
        $this->tree    = $tree;
    }

    /**
     * Returns the default number of generations to display.
     *
     * @return int
     */
    private function getDefaultGenerations(): int
    {
        return (int) $this->tree->getPreference('DEFAULT_PEDIGREE_GENERATIONS');
    }

    /**
     * Returns the number of generations to display.
     *
     * @return int
     */
    public function getGenerations(): int
    {
        $generations = (int) $this->request->get('generations', $this->getDefaultGenerations());
        $generations = min($generations, self::MAX_GENERATIONS);

        return max($generations, self::MIN_GENERATIONS);
    }

    /**
     * Returns whether to show empty boxes or not.
     *
     * @return bool
     */
    public function getShowEmptyBoxes(): bool
    {
        return (bool) $this->request->get('showEmptyBoxes');
    }
}
