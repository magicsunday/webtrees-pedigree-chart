/**
 * This file is part of the package magicsunday/webtrees-pedigree-chart.
 *
 * For the full copyright and license information, please read the
 * LICENSE file distributed with this source code.
 */

import { afterEach, describe, expect, test } from "@jest/globals";

import {
    LAYOUT_BOTTOMTOP,
    LAYOUT_HORIZONTAL_NODE_HEIGHT,
    LAYOUT_HORIZONTAL_NODE_WIDTH,
    LAYOUT_LEFTRIGHT,
    LAYOUT_RIGHTLEFT,
    LAYOUT_TOPBOTTOM,
    LAYOUT_VERTICAL_NODE_HEIGHT,
    LAYOUT_VERTICAL_NODE_WIDTH,
} from "../modules/constants.js";
import OrientationCollection from "../modules/chart/orientation-collection.js";

// The four layouts differ by the spread axis and by the sign of the direction along the depth axis.
// The horizontal layouts flip their direction in a right-to-left document, the vertical ones do not.
const LAYOUTS = [
    {
        key: LAYOUT_TOPBOTTOM,
        vertical: true,
        box: [LAYOUT_VERTICAL_NODE_WIDTH, LAYOUT_VERTICAL_NODE_HEIGHT],
        direction: { ltr: 1, rtl: 1 },
    },
    {
        key: LAYOUT_BOTTOMTOP,
        vertical: true,
        box: [LAYOUT_VERTICAL_NODE_WIDTH, LAYOUT_VERTICAL_NODE_HEIGHT],
        direction: { ltr: -1, rtl: -1 },
    },
    {
        key: LAYOUT_LEFTRIGHT,
        vertical: false,
        box: [LAYOUT_HORIZONTAL_NODE_WIDTH, LAYOUT_HORIZONTAL_NODE_HEIGHT],
        direction: { ltr: 1, rtl: -1 },
    },
    {
        key: LAYOUT_RIGHTLEFT,
        vertical: false,
        box: [LAYOUT_HORIZONTAL_NODE_WIDTH, LAYOUT_HORIZONTAL_NODE_HEIGHT],
        direction: { ltr: -1, rtl: 1 },
    },
];

afterEach(() => {
    document.dir = "";
});

describe("OrientationCollection", () => {
    test("offers exactly the four layouts", () => {
        const keys = Object.keys(new OrientationCollection().get()).sort();

        expect(keys).toEqual(LAYOUTS.map((layout) => layout.key).sort());
    });

    describe.each(LAYOUTS)("layout $key", (layout) => {
        const orientation = () => new OrientationCollection().get()[layout.key];

        test("spreads along the expected axis with the box of its axis", () => {
            expect(orientation().isVertical).toBe(layout.vertical);
            expect([orientation().boxWidth, orientation().boxHeight]).toEqual(layout.box);
        });

        test("runs along the depth axis in its direction under both document directions", () => {
            document.dir = "ltr";
            expect(orientation().direction).toBe(layout.direction.ltr);

            document.dir = "rtl";
            expect(orientation().direction).toBe(layout.direction.rtl);
        });
    });
});
