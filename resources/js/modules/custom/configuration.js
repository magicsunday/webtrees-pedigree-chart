/**
 * This file is part of the package magicsunday/webtrees-pedigree-chart.
 *
 * For the full copyright and license information, please read the
 * LICENSE file distributed with this source code.
 */

import OrientationCollection from "../lib/chart/orientation-collection";
import {LAYOUT_LEFTRIGHT} from "../lib/constants";

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
     * @param {boolean}  showEmptyBoxes
     * @param {string}   treeLayout
     * @param {boolean}  openNewTabOnClick
     * @param {boolean}  showAlternativeName
     * @param {boolean}  rtl
     * @param {number}   direction
     */
    constructor(
        labels,
        generations = 4,
        showEmptyBoxes = false,
        treeLayout = LAYOUT_LEFTRIGHT,
        openNewTabOnClick = true,
        showAlternativeName = true,
        rtl = false,
        direction = 1
    ) {
        // The layout/orientation of the tree
        this._treeLayout   = treeLayout;
        this._orientations = new OrientationCollection();

        this._showEmptyBoxes = showEmptyBoxes;
        this._openNewTabOnClick = openNewTabOnClick;
        this._showAlternativeName = showAlternativeName;

        //
        this.duration = 750;

        //
        this.padding   = 15;

        // Default number of generations to display
        this._generations = generations;

        // Left/Right padding of a text (used with truncation)
        this.textPadding = 8;

        // // Default font size, color and scaling
        this._fontSize  = 14;
        // this._fontScale = fontScale;
        this.fontColor = "rgb(0, 0, 0)";

        // Duration of update animation if clicked on a person
        // this.updateDuration = 1250;

        this.rtl    = rtl;
        this.labels = labels;

        // Direction is either 1 (forward) or -1 (backward)
        this.direction = direction;
    }

    /**
     * Returns the number of generations to display.
     *
     * @returns {number}
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
     * @returns {boolean}
     */
    get showEmptyBoxes()
    {
        return this._showEmptyBoxes;
    }

    /**
     * Returns the tree layout.
     *
     * @returns {string}
     */
    get treeLayout()
    {
        return this._treeLayout;
    }

    /**
     * Sets the tree layout.
     *
     * @param {string} value Tree layout value
     */
    set treeLayout(value)
    {
        this._treeLayout = value;
    }

    /**
     * Returns the current orientation.
     *
     * @returns {Orientation}
     */
    get orientation()
    {
        return this._orientations.get()[this.treeLayout];
    }

    /**
     * Returns TRUE or FALSE depending on whether to open the current individual's details page in a new tab.
     *
     * @returns {boolean}
     */
    get openNewTabOnClick()
    {
        return this._openNewTabOnClick;
    }

    /**
     * Returns whether to show or hide the alternative name.
     *
     * @returns {boolean}
     */
    get showAlternativeName()
    {
        return this._showAlternativeName;
    }
}
