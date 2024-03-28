/**
 * This file is part of the package magicsunday/webtrees-pedigree-chart.
 *
 * For the full copyright and license information, please read the
 * LICENSE file distributed with this source code.
 */

/**
 * The widths and heights of a single node in each tree layout.
 *
 * @type {Number}
 * @const
 */
export const LAYOUT_HORIZONTAL_NODE_WIDTH = 325;
export const LAYOUT_HORIZONTAL_NODE_HEIGHT = 95;
export const LAYOUT_VERTICAL_NODE_WIDTH = 160;
export const LAYOUT_VERTICAL_NODE_HEIGHT = 175;

export const LAYOUT_VERTICAL_NODE_HEIGHT_OFFSET = 30;

/**
 * Tree layout variants.
 *
 * @type {String}
 * @const
 *
 * @see \Fisharebest\Webtrees\Module\PedigreeChartModule
 */
export const LAYOUT_TOPBOTTOM = "down";
export const LAYOUT_BOTTOMTOP = "up";
export const LAYOUT_LEFTRIGHT = "right";
export const LAYOUT_RIGHTLEFT = "left";

/**
 * Gender types.
 *
 * @type {String}
 * @const
 */
export const SEX_MALE = "M";
export const SEX_FEMALE = "F";
