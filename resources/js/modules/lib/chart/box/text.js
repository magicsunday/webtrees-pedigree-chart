/**
 * This file is part of the package magicsunday/webtrees-pedigree-chart.
 *
 * For the full copyright and license information, please read the
 * LICENSE file distributed with this source code.
 */

import OrientationLeftRight from "../orientation/orientation-leftRight";
import OrientationRightLeft from "../orientation/orientation-rightLeft";
import OrientationTopBottom from "../orientation/orientation-topBottom";
import OrientationBottomTop from "../orientation/orientation-bottomTop";

/**
 * The person text box container.
 *
 * @author  Rico Sonntag <mail@ricosonntag.de>
 * @license https://opensource.org/licenses/GPL-3.0 GNU General Public License v3.0
 * @link    https://github.com/magicsunday/webtrees-pedigree-chart/
 */
export default class Text
{
    /**
     * Constructor.
     *
     * @param {Orientation} orientation The current orientation
     * @param {null|Image}  image       The image
     */
    constructor(orientation, image = null)
    {
        this._orientation  = orientation;
        this._image        = image;
        this._textPaddingX = 15;
        this._textPaddingY = 15;

        if ((this._orientation instanceof OrientationTopBottom)
            || (this._orientation instanceof OrientationBottomTop)
        ) {
            this._textPaddingX = 5;
            this._textPaddingY = 15;
        }

        // Calculate values
        this._x     = this.calculateX();
        this._y     = this.calculateY();
        this._width = this.calculateWidth();
    }

    /**
     * Returns the calculated X-coordinate.
     *
     * @returns {number}
     */
    calculateX()
    {
        return -(this._orientation.boxWidth / 2) + this._textPaddingX;
    }

    /**
     * Returns the calculated Y-coordinate.
     *
     * @returns {number}
     */
    calculateY()
    {
        if ((this._orientation instanceof OrientationLeftRight)
            || (this._orientation instanceof OrientationRightLeft)
        ) {
            return -this._textPaddingY;
        }

        return this._image.y + this._image.height + (this._textPaddingY * 2);
    }

    /**
     * Calculate the available text width.
     *
     * @returns {number}
     */
    calculateWidth()
    {
        // Width of the text minus the right/left padding
        return this._orientation.boxWidth - (this._textPaddingX * 2);
    }

    /**
     * Returns the X-coordinate of the text start.
     *
     * @returns {number}
     */
    get x()
    {
        return this._x;
    }

    /**
     * Returns the Y-coordinate of the text start.
     *
     * @returns {number}
     */
    get y()
    {
        return this._y;
    }

    /**
     * Returns the width of the text.
     *
     * @returns {number}
     */
    get width()
    {
        return this._width;

    }
}
