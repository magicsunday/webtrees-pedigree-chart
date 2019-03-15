<?php
declare(strict_types=1);

/**
 * See LICENSE.md file for further details.
 */
namespace MagicSunday\Webtrees\PedigreeChart;

use Fisharebest\Webtrees\Functions\FunctionsEdit;
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
     * The current request instance.
     *
     * @var Request
     */
    private $request;

    /**
     * Config constructor.
     *
     * @param Request $request The current HTTP request
     */
    public function __construct(Request $request)
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
        $generations = (int) $this->request->get('generations', self::DEFAULT_GENERATIONS);
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
        return FunctionsEdit::numericOptions(range(self::MIN_GENERATIONS, self::MAX_GENERATIONS));
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
