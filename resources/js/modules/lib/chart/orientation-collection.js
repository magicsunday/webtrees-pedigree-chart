/**
 * This file is part of the package magicsunday/webtrees-pedigree-chart.
 *
 * For the full copyright and license information, please read the
 * LICENSE file distributed with this source code.
 */

import {
    LAYOUT_BOTTOMTOP,
    LAYOUT_LEFTRIGHT,
    LAYOUT_RIGHTLEFT,
    LAYOUT_TOPBOTTOM,
    LAYOUT_VERTICAL_NODE_WIDTH,
    LAYOUT_VERTICAL_NODE_HEIGHT,
    LAYOUT_HORIZONTAL_NODE_WIDTH,
    LAYOUT_HORIZONTAL_NODE_HEIGHT,
} from "../constants.js";

import {
    OrientationBottomTop,
    OrientationLeftRight,
    OrientationRightLeft,
    OrientationTopBottom,
} from "@magicsunday/webtrees-chart-lib";

/**
 * This class handles the orientation of the tree.
 *
 * @author  Rico Sonntag <mail@ricosonntag.de>
 * @license https://opensource.org/licenses/GPL-3.0 GNU General Public License v3.0
 * @link    https://github.com/magicsunday/webtrees-pedigree-chart/
 */
export default class OrientationCollection {
    /**
     * Constructor.
     */
    constructor() {
        this._orientations = {
            [LAYOUT_TOPBOTTOM]: new OrientationTopBottom(LAYOUT_VERTICAL_NODE_WIDTH, LAYOUT_VERTICAL_NODE_HEIGHT),
            [LAYOUT_BOTTOMTOP]: new OrientationBottomTop(LAYOUT_VERTICAL_NODE_WIDTH, LAYOUT_VERTICAL_NODE_HEIGHT),
            [LAYOUT_LEFTRIGHT]: new OrientationLeftRight(LAYOUT_HORIZONTAL_NODE_WIDTH, LAYOUT_HORIZONTAL_NODE_HEIGHT),
            [LAYOUT_RIGHTLEFT]: new OrientationRightLeft(LAYOUT_HORIZONTAL_NODE_WIDTH, LAYOUT_HORIZONTAL_NODE_HEIGHT),
        };
    }

    /**
     * Returns the internal element.
     *
     * @returns {Array}
     */
    get() {
        return this._orientations;
    }
}
