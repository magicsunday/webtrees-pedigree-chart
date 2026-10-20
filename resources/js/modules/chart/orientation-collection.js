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

import { Orientation } from "@magicsunday/webtrees-chart-lib/infra";

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
            [LAYOUT_TOPBOTTOM]: new Orientation(
                LAYOUT_VERTICAL_NODE_WIDTH,
                LAYOUT_VERTICAL_NODE_HEIGHT,
                { vertical: true, flip: false },
            ),
            [LAYOUT_BOTTOMTOP]: new Orientation(
                LAYOUT_VERTICAL_NODE_WIDTH,
                LAYOUT_VERTICAL_NODE_HEIGHT,
                { vertical: true, flip: true },
            ),
            [LAYOUT_LEFTRIGHT]: new Orientation(
                LAYOUT_HORIZONTAL_NODE_WIDTH,
                LAYOUT_HORIZONTAL_NODE_HEIGHT,
                { vertical: false, flip: false },
            ),
            [LAYOUT_RIGHTLEFT]: new Orientation(
                LAYOUT_HORIZONTAL_NODE_WIDTH,
                LAYOUT_HORIZONTAL_NODE_HEIGHT,
                { vertical: false, flip: true },
            ),
        };
    }

    /**
     * Returns the orientations indexed by layout key.
     *
     * @return {Record<string, Orientation>}
     */
    get() {
        return this._orientations;
    }
}
