/**
 * See LICENSE.md file for further details.
 */

/**
 * This class handles the options passed from outside to the application.
 *
 * @author  Rico Sonntag <mail@ricosonntag.de>
 * @license https://opensource.org/licenses/GPL-3.0 GNU General Public License v3.0
 * @link    https://github.com/magicsunday/webtrees-pedigree-chart/
 */
export default class Options
{
    /**
     * Constructor.
     *
     * @param individualUrl
     * @param labels
     * @param generations
     * @param defaultColor
     * @param fontColor
     * @param rtl
     * @param showEmptyBoxes
     * @param direction
     */
    constructor(
        individualUrl,
        labels,
        generations    = 3,
        defaultColor   = "#eee",
        fontColor      = "#000",
        rtl            = false,
        showEmptyBoxes = false,
        direction      = 1
    ) {
        this.data = null;

        // Default number of generations to display
        this.generations = generations;

        // Left/Right padding of text (used with truncation)
        this.textPadding = 8;

        // Default background color of an arc
        this.defaultColor = defaultColor;

        // Default font size, color and scaling
        this.fontSize  = 14;
        this.fontColor = fontColor;

        this.individualUrl = individualUrl;

        this.showEmptyBoxes = showEmptyBoxes;

        this.rtl    = rtl;
        this.labels = labels;

        // direction` is either 1 (forward) or -1 (backward)
        this.direction = direction;
    }
}
