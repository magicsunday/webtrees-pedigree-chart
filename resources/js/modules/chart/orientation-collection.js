/**
 * See LICENSE.md file for further details.
 */

import {LAYOUT_BOTTOMTOP, LAYOUT_LEFTRIGHT, LAYOUT_RIGHTLEFT, LAYOUT_TOPBOTTOM} from "../constants";
import OrientationTopBottom from "./orientation/orientation-topBottom";
import OrientationBottomTop from "./orientation/orientation-bottomTop";
import OrientationLeftRight from "./orientation/orientation-leftRight";
import OrientationRightLeft from "./orientation/orientation-rightLeft";

/**
 * This class handles the orientation of the tree.
 *
 * @author  Rico Sonntag <mail@ricosonntag.de>
 * @license https://opensource.org/licenses/GPL-3.0 GNU General Public License v3.0
 * @link    https://github.com/magicsunday/webtrees-pedigree-chart/
 */
export default class OrientationCollection
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

        this._orientations = {
            [LAYOUT_TOPBOTTOM]: new OrientationTopBottom(boxWidth, boxHeight),
            [LAYOUT_BOTTOMTOP]: new OrientationBottomTop(boxWidth, boxHeight),
            [LAYOUT_LEFTRIGHT]: new OrientationLeftRight(boxWidth, boxHeight),
            [LAYOUT_RIGHTLEFT]: new OrientationRightLeft(boxWidth, boxHeight)
        };
    }

    /**
     * Returns the internal element.
     *
     * @return {Array}
     */
    get()
    {
        return this._orientations;
    }
}
