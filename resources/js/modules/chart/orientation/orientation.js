/**
 * See LICENSE.md file for further details.
 */

/**
 * The orientation base class.
 *
 * @author  Rico Sonntag <mail@ricosonntag.de>
 * @license https://opensource.org/licenses/GPL-3.0 GNU General Public License v3.0
 * @link    https://github.com/magicsunday/webtrees-pedigree-chart/
 */
export default class Orientation
{
    /**
     * Constructor.
     *
     * @param {Number} boxWidth  The width of a single individual box
     * @param {Number} boxHeight The height of a single individual box
     */
    constructor(boxWidth, boxHeight)
    {
        this._boxWidth  = boxWidth;
        this._boxHeight = boxHeight;
    }

    /**
     * Returns the width of the box.
     *
     * @returns {Number}
     */
    get boxWidth()
    {
        return this._boxWidth;
    }

    /**
     * Returns the height of the box.
     *
     * @returns {Number}
     */
    get boxHeight()
    {
        return this._boxHeight;
    }
}
