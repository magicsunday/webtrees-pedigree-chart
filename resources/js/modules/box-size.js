/**
 * This file is part of the package magicsunday/webtrees-pedigree-chart.
 *
 * For the full copyright and license information, please read the
 * LICENSE file distributed with this source code.
 */

import {
    LAYOUT_HORIZONTAL_NODE_HEIGHT,
    LAYOUT_HORIZONTAL_NODE_WIDTH,
    LAYOUT_VERTICAL_NODE_HEIGHT,
    LAYOUT_VERTICAL_NODE_HEIGHT_OFFSET,
    LAYOUT_VERTICAL_NODE_WIDTH,
    factRowsExtent,
} from "@magicsunday/webtrees-chart-lib/linked-tree";

/**
 * The width of a vertical box that shows fact rows, wide enough for a date and a place.
 */
const VERTICAL_FACT_BOX_WIDTH = 240;

/**
 * The distance from the centre of a horizontal box to its first date row.
 */
const HORIZONTAL_FIRST_ROW_Y = 15;

/**
 * The room below the last row of a horizontal box, measured from the row centre.
 */
const HORIZONTAL_BOTTOM_PADDING = 11.5;

/**
 * Returns the size of a person box.
 *
 * The result depends on the options only, never on an earlier size, so calling it again for the
 * same options cannot grow the box a second time.
 *
 * @param {object}  options
 * @param {boolean} options.vertical            Whether the chart grows from top to bottom or the other way
 * @param {boolean} options.showAlternativeName Whether the alternative name row is shown
 * @param {{showPlaces: boolean, optionalRows: number}|null} options.facts The layout of the fact
 *        rows, or null when the box shows the legacy date line
 *
 * @return {{width: number, height: number}}
 */
export function boxSize({ vertical, showAlternativeName, facts }) {
    const extent = facts === null ? 0 : factRowsExtent(facts);

    if (vertical) {
        return {
            width: facts === null ? LAYOUT_VERTICAL_NODE_WIDTH : VERTICAL_FACT_BOX_WIDTH,
            height:
                LAYOUT_VERTICAL_NODE_HEIGHT +
                (showAlternativeName ? LAYOUT_VERTICAL_NODE_HEIGHT_OFFSET : 0) +
                extent,
        };
    }

    return {
        width: LAYOUT_HORIZONTAL_NODE_WIDTH,
        height:
            facts === null
                ? LAYOUT_HORIZONTAL_NODE_HEIGHT
                : Math.max(
                      LAYOUT_HORIZONTAL_NODE_HEIGHT,
                      2 * (HORIZONTAL_FIRST_ROW_Y + extent + HORIZONTAL_BOTTOM_PADDING),
                  ),
    };
}
