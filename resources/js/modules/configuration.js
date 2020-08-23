/**
 * See LICENSE.md file for further details.
 */

/**
 * This class handles the configuration of the application.
 *
 * @author  Rico Sonntag <mail@ricosonntag.de>
 * @license https://opensource.org/licenses/GPL-3.0 GNU General Public License v3.0
 * @link    https://github.com/magicsunday/webtrees-pedigree-chart/
 */
export default class Configuration
{
    /**
     * Constructor.
     *
     * @param {string[]} labels
     * @param {number}   generations
     * @param {string}   defaultColor
     * @param {string}   fontColor
     * @param {boolean}  showEmptyBoxes
     * @param {boolean}  rtl
     * @param {number}   direction
     */
    constructor(
        labels,
        generations     = 4,
        defaultColor     = "rgb(238, 238, 238)",
        fontColor        = "rgb(0, 0, 0)",
        showEmptyBoxes = false,
        rtl            = false,
        direction      = 1
    ) {
        // Default number of generations to display
        this._generations = generations;

        // Left/Right padding of text (used with truncation)
        this.textPadding = 8;

        // Default background color of an arc
        this.defaultColor = defaultColor;

        // // Default font size, color and scaling
        this._fontSize  = 14;
        // this._fontScale = fontScale;
        this.fontColor = fontColor;

        this._showEmptyBoxes  = showEmptyBoxes;

        // Duration of update animation if clicked on a person
        // this.updateDuration = 1250;

        this.rtl    = rtl;
        this.labels = labels;

        // direction` is either 1 (forward) or -1 (backward)
        this.direction = direction;
    }

    /**
     * Returns the number of generations to display.
     *
     * @return {number}
     */
    get generations()
    {
        return this._generations;
    }

    /**
     * Sets the number of generations to display.
     *
     * @param {number} value The number of generations to display
     */
    set generations(value)
    {
        this._generations = value;
    }

    /**
     * Returns whether to show or hide empty boxes.
     *
     * @return {boolean}
     */
    get showEmptyBoxes()
    {
        return this._showEmptyBoxes;
    }

    /**
     * Sets whether to show or hide empty boxes.
     *
     * @param {boolean} value Either true or false
     */
    set showEmptyBoxes(value)
    {
        this._showEmptyBoxes = value;
    }
}
