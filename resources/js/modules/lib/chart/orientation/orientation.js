/**
 * This file is part of the package magicsunday/webtrees-pedigree-chart.
 *
 * For the full copyright and license information, please read the
 * LICENSE file distributed with this source code.
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
     * @param {number} boxWidth  The width of a single individual box
     * @param {number} boxHeight The height of a single individual box
     */
    constructor(boxWidth, boxHeight)
    {
        // The distance between single nodes
        this._xOffset = 30;
        this._yOffset = 40;

        this._boxWidth    = boxWidth;
        this._boxHeight   = boxHeight;
        this._splittNames = false;
    }

    /**
     * Returns TRUE if the document is in RTL direction.
     *
     * @returns {boolean}
     */
    get isDocumentRtl()
    {
        return document.dir === "rtl";
    }

    /**
     * Returns the x-offset between two boxes.
     *
     * @returns {number}
     */
    get xOffset()
    {
        return this._xOffset;
    }

    /**
     * Returns the y-offset between two boxes.
     *
     * @returns {number}
     */
    get yOffset()
    {
        return this._yOffset;
    }

    /**
     * Returns whether to splitt the names on multiple lines or not.
     *
     * @returns {boolean}
     */
    get splittNames()
    {
        return this._splittNames;
    }

    /**
     * Returns the width of the box.
     *
     * @returns {number}
     */
    get boxWidth()
    {
        return this._boxWidth;
    }

    /**
     * Returns the height of the box.
     *
     * @returns {number}
     */
    get boxHeight()
    {
        return this._boxHeight;
    }

    /**
     * Returns the height of the box.
     *
     * @params {number} boxHeight
     */
    set boxHeight(boxHeight)
    {
        this._boxHeight = boxHeight;
    }

    /**
     * Returns the direction.
     *
     * @returns {number}
     */
    get direction()
    {
        throw "Abstract method direction() not implemented";
    }

    /**
     * Returns the width of the node.
     *
     * @returns {number}
     */
    get nodeWidth()
    {
        throw "Abstract method nodeWidth() not implemented";
    }

    /**
     * Returns the height of the node.
     *
     * @returns {number}
     */
    get nodeHeight()
    {
        throw "Abstract method nodeHeight() not implemented";
    }

    /**
     * Normalizes the x and/or y values of an entry.
     *
     * @param {Individual} d
     */
    norm(d)
    {
        throw "Abstract method norm() not implemented";
    }

    /**
     * Returns the elbow function depending on the orientation.
     *
     * @param {Link} link
     *
     * @returns {string}
     */
    elbow(link)
    {
        throw "Abstract method elbow() not implemented";
    }
}
