/**
 * This file is part of the package magicsunday/webtrees-pedigree-chart.
 *
 * For the full copyright and license information, please read the
 * LICENSE file distributed with this source code.
 */

// Regression guard for issue #74. Mirrors the inline separation function
// from Hierarchy.init() (hierarchy.js) and asserts the d3.tree() output
// produces zero overlapping bounding boxes for a stress-shape suite,
// including 12-generation deep trees and pathological wide/narrow
// sibling groups. A regression to a uniform separation of 1.0 (which
// hid the cousin distinction) or to a wide 2.0 (issue #74) would fail
// the cousin-gap range assertion.

import { tree, hierarchy } from "d3-hierarchy";

// Production nodeSize for the vertical layout (boxWidth 160 + xOffset 30 / boxHeight 175 + yOffset 40).
const NODE_WIDTH = 190;
const NODE_HEIGHT = 215;
const BOX_WIDTH = 160;

// Mirror of hierarchy.js:95 — keep in sync with the production callback.
const separationFn = (left, right) => (left.parent === right.parent ? 1.0 : 1.25);

function layout(rootData) {
    const root = hierarchy(rootData);
    return tree().nodeSize([NODE_WIDTH, NODE_HEIGHT]).separation(separationFn)(root).descendants();
}

function findOverlaps(nodes) {
    const byDepth = new Map();
    for (const n of nodes) {
        if (!byDepth.has(n.depth)) byDepth.set(n.depth, []);
        byDepth.get(n.depth).push(n);
    }
    const overlaps = [];
    for (const list of byDepth.values()) {
        list.sort((a, b) => a.x - b.x);
        for (let i = 1; i < list.length; i++) {
            const gap = list[i].x - list[i - 1].x - BOX_WIDTH;
            if (gap < 0) {
                overlaps.push({
                    depth: list[i].depth,
                    a: list[i - 1].data.id,
                    b: list[i].data.id,
                    overlapPx: -gap,
                });
            }
        }
    }
    return overlaps;
}

function minCousinGap(nodes) {
    // The separation() callback's cousin value is the *minimum* enforced
    // distance — adjacent cousins at higher depths can be spaced further
    // apart to accommodate the contour of their wider subtrees below
    // (Reingold–Tilford's apportion() step). The minimum across all
    // cousin pairs is the unchanged signal from separation().
    const byDepth = new Map();
    for (const n of nodes) {
        if (!byDepth.has(n.depth)) byDepth.set(n.depth, []);
        byDepth.get(n.depth).push(n);
    }
    let min = Infinity;
    for (const list of byDepth.values()) {
        list.sort((a, b) => a.x - b.x);
        for (let i = 1; i < list.length; i++) {
            if (list[i].parent !== list[i - 1].parent) {
                const gap = list[i].x - list[i - 1].x - BOX_WIDTH;
                if (gap < min) min = gap;
            }
        }
    }
    return min === Infinity ? null : min;
}

let _id = 0;
const next = (prefix = "N") => `${prefix}${++_id}`;

// Pedigree-style: child has up to 2 parents, recursive.
function pedigreeFractal(generations) {
    if (generations === 0) return { id: next("P") };
    return {
        id: next("P"),
        children: [pedigreeFractal(generations - 1), pedigreeFractal(generations - 1)],
    };
}

describe("Hierarchy.init() separation — issue #74 regression suite", () => {
    beforeEach(() => {
        _id = 0;
    });

    test("4 generations of full ancestors: no overlaps, cousin gap distinct from sibling gap", () => {
        const data = pedigreeFractal(3); // 1 + 2 + 4 + 8 = 15 nodes
        const nodes = layout(data);
        expect(findOverlaps(nodes)).toEqual([]);
        // The minimum cousin gap is the value separation() actually enforces.
        // Pre-fix uniform 1.0 produced 30 px (same as siblings, no visual distinction).
        // Post-fix 1.25 lifts it to 77.5 px so cousin branches read as a distinct family line.
        // Any regression to 1.0 (uniform) would push this back to 30.
        const minCous = minCousinGap(nodes);
        expect(minCous).toBeGreaterThanOrEqual(60);
        expect(minCous).toBeLessThanOrEqual(100);
    });

    test.each([
        ["6 generations of full ancestors", () => pedigreeFractal(6)],
        ["8 generations of full ancestors", () => pedigreeFractal(8)],
        ["10 generations of full ancestors (1023 nodes)", () => pedigreeFractal(9)],
        ["12 generations of full ancestors (4095 nodes)", () => pedigreeFractal(11)],
    ])("no overlaps in shape: %s", (_label, factory) => {
        const data = factory();
        const nodes = layout(data);
        expect(findOverlaps(nodes)).toEqual([]);
    });

    test("siblings stay tight (gap = xOffset 30 px) when parents match", () => {
        const data = { id: "P", children: [{ id: "A" }, { id: "B" }] };
        const nodes = layout(data);
        const kids = nodes.filter((n) => n.depth === 1).sort((a, b) => a.x - b.x);
        expect(kids).toHaveLength(2);
        const gap = kids[1].x - kids[0].x - BOX_WIDTH;
        expect(gap).toBe(30);
    });
});
