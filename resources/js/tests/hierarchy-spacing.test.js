/**
 * This file is part of the package magicsunday/webtrees-pedigree-chart.
 *
 * For the full copyright and license information, please read the
 * LICENSE file distributed with this source code.
 */

// Regression guard for the horizontal spacing of the vertical layout. The tests lay out real
// ancestor trees through Hierarchy.init() with the OrientationCollection of the chart-lib, so
// the separation that production applies is the one under test. Siblings of one child sit one
// node width apart, cousin branches farther but not by much, and no two boxes of a generation
// overlap.

import { describe, expect, test } from "@jest/globals";

import {
    LAYOUT_TOPBOTTOM,
    OrientationCollection,
} from "@magicsunday/webtrees-chart-lib/linked-tree";
import Hierarchy from "../modules/hierarchy.js";

const orientation = new OrientationCollection().get()[LAYOUT_TOPBOTTOM];
const BOX_WIDTH = orientation.boxWidth;
const NODE_WIDTH = orientation.nodeWidth;

const layout = (datum) => {
    const hierarchy = new Hierarchy({
        showAlternativeName: false,
        orientation: new OrientationCollection().get()[LAYOUT_TOPBOTTOM],
    });
    hierarchy.init(datum);

    return hierarchy.nodes.descendants();
};

const byDepth = (nodes) => {
    const groups = new Map();

    for (const node of nodes) {
        if (!groups.has(node.depth)) {
            groups.set(node.depth, []);
        }

        groups.get(node.depth).push(node);
    }

    for (const list of groups.values()) {
        list.sort((a, b) => a.x - b.x);
    }

    return [...groups.values()];
};

const findOverlaps = (nodes) =>
    byDepth(nodes).flatMap((list) =>
        list
            .slice(1)
            .filter((node, index) => node.x - list[index].x - BOX_WIDTH < 0)
            .map((node) => node.depth),
    );

// Smallest centre distance between two neighbours of one generation that have different parents.
const minCousinDistance = (nodes) =>
    Math.min(
        ...byDepth(nodes).flatMap((list) =>
            list
                .slice(1)
                .filter((node, index) => node.parent !== list[index].parent)
                .map((node) => node.x - list[list.indexOf(node) - 1].x),
        ),
    );

// Full ancestor tree, every person has two parents down to the given generation count.
const pedigree = (generations) =>
    generations === 1
        ? { parents: [] }
        : { parents: [pedigree(generations - 1), pedigree(generations - 1)] };

describe("Hierarchy.init spacing", () => {
    test("siblings of one child sit exactly one node width apart", () => {
        const [, mother, father] = layout(pedigree(2));

        expect(Math.abs(father.x - mother.x)).toBe(NODE_WIDTH);
    });

    test("cousin branches are spaced wider than siblings but not much wider", () => {
        const distance = minCousinDistance(layout(pedigree(4)));

        expect(distance).toBeGreaterThan(NODE_WIDTH);
        expect(distance).toBeLessThanOrEqual(NODE_WIDTH * 1.5);
    });

    test.each([4, 8, 12])("no boxes overlap in %i generations of full ancestors", (generations) => {
        expect(findOverlaps(layout(pedigree(generations)))).toEqual([]);
    });
});
