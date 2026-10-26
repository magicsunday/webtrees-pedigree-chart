/**
 * This file is part of the package magicsunday/webtrees-pedigree-chart.
 *
 * For the full copyright and license information, please read the
 * LICENSE file distributed with this source code.
 */

import { afterEach, describe, expect, test } from "@jest/globals";

import {
    LAYOUT_BOTTOMTOP,
    LAYOUT_HORIZONTAL_NODE_WIDTH,
    LAYOUT_LEFTRIGHT,
    LAYOUT_RIGHTLEFT,
    LAYOUT_TOPBOTTOM,
    LAYOUT_VERTICAL_NODE_HEIGHT,
    OrientationCollection,
} from "@magicsunday/webtrees-chart-lib/linked-tree";
import Hierarchy from "../modules/hierarchy.js";

// Two parents of the root person. The tree layout places them one generation away from the root
// along its depth axis, and Hierarchy.init() normalises the laid-out coordinates by the layout
// direction, so the parents end up on the side of the root that the layout runs towards.
const DATUM = { parents: [{ parents: [] }, { parents: [] }] };

// The depth distance between two generations is the node height of the vertical layouts (box
// height plus the vertical offset) and the node height of the horizontal ones (box width plus the
// horizontal offset).
const VERTICAL_DEPTH = LAYOUT_VERTICAL_NODE_HEIGHT + 40;
const HORIZONTAL_DEPTH = LAYOUT_HORIZONTAL_NODE_WIDTH + 40;

const parentsOf = (layout) => {
    const configuration = {
        showAlternativeName: false,
        factLayout: null,
        orientation: new OrientationCollection().get()[layout],
    };
    const hierarchy = new Hierarchy(configuration);
    hierarchy.init(DATUM);

    return hierarchy.nodes.children;
};

afterEach(() => {
    document.dir = "";
});

describe("Hierarchy.init normalisation", () => {
    test("the vertical layouts run down or up along the y axis", () => {
        expect(parentsOf(LAYOUT_TOPBOTTOM).map((node) => node.y)).toEqual([
            VERTICAL_DEPTH,
            VERTICAL_DEPTH,
        ]);
        expect(parentsOf(LAYOUT_BOTTOMTOP).map((node) => node.y)).toEqual([
            -VERTICAL_DEPTH,
            -VERTICAL_DEPTH,
        ]);
    });

    test("the horizontal layouts run right or left along the x axis in a left-to-right document", () => {
        document.dir = "ltr";

        expect(parentsOf(LAYOUT_LEFTRIGHT).map((node) => node.x)).toEqual([
            HORIZONTAL_DEPTH,
            HORIZONTAL_DEPTH,
        ]);
        expect(parentsOf(LAYOUT_RIGHTLEFT).map((node) => node.x)).toEqual([
            -HORIZONTAL_DEPTH,
            -HORIZONTAL_DEPTH,
        ]);
    });

    test("the horizontal layouts swap their direction in a right-to-left document", () => {
        document.dir = "rtl";

        expect(parentsOf(LAYOUT_LEFTRIGHT).map((node) => node.x)).toEqual([
            -HORIZONTAL_DEPTH,
            -HORIZONTAL_DEPTH,
        ]);
        expect(parentsOf(LAYOUT_RIGHTLEFT).map((node) => node.x)).toEqual([
            HORIZONTAL_DEPTH,
            HORIZONTAL_DEPTH,
        ]);
    });
});
