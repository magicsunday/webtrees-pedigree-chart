/**
 * This file is part of the package magicsunday/webtrees-pedigree-chart.
 *
 * For the full copyright and license information, please read the
 * LICENSE file distributed with this source code.
 */

import { describe, expect, test } from "@jest/globals";

import {
    LAYOUT_BOTTOMTOP,
    LAYOUT_LEFTRIGHT,
    LAYOUT_RIGHTLEFT,
    LAYOUT_TOPBOTTOM,
    LAYOUT_VERTICAL_NODE_HEIGHT_OFFSET,
    OrientationCollection,
} from "@magicsunday/webtrees-chart-lib/linked-tree";
import Hierarchy from "../modules/hierarchy.js";

/**
 * Initializes a hierarchy for a layout and returns the box height of its orientation before and
 * after the initialization.
 *
 * @param {string}  layout              The layout of the chart
 * @param {boolean} showAlternativeName Whether the alternative name is shown
 *
 * @return {{before: number, after: number}}
 */
const boxHeightsFor = (layout, showAlternativeName) => {
    const orientation = new OrientationCollection().get()[layout];
    const before = orientation.boxHeight;

    new Hierarchy({ showAlternativeName, orientation }).init({ parents: [] });

    return { before, after: orientation.boxHeight };
};

describe("Hierarchy.init box height for the alternative name", () => {
    test.each([LAYOUT_TOPBOTTOM, LAYOUT_BOTTOMTOP])(
        "grows the box by the offset in the vertical layout %s",
        (layout) => {
            const { before, after } = boxHeightsFor(layout, true);

            expect(after).toBe(before + LAYOUT_VERTICAL_NODE_HEIGHT_OFFSET);
        },
    );

    test.each([LAYOUT_LEFTRIGHT, LAYOUT_RIGHTLEFT])(
        "keeps the box height in the horizontal layout %s",
        (layout) => {
            const { before, after } = boxHeightsFor(layout, true);

            expect(after).toBe(before);
        },
    );

    test.each([LAYOUT_TOPBOTTOM, LAYOUT_LEFTRIGHT])(
        "keeps the box height in the layout %s with the option off",
        (layout) => {
            const { before, after } = boxHeightsFor(layout, false);

            expect(after).toBe(before);
        },
    );
});
