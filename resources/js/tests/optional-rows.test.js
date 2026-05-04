/**
 * This file is part of the package magicsunday/webtrees-pedigree-chart.
 *
 * For the full copyright and license information, please read the
 * LICENSE file distributed with this source code.
 */

// Tests for Hierarchy.maxPopulatedOptionalRows(): the chart-wide maximum
// of populated optional fact slots across all individuals in the tree.
// Used to size box height — boxes grow only as much as the most-detailed
// individual actually needs, not as much as the configured slot list.

import Hierarchy from "../modules/hierarchy.js";

function person(facts) {
    return { data: { facts } };
}

function withParents(self, parents = []) {
    return { ...self, parents };
}

function emptySlot() {
    return null;
}

function populatedSlot(tag = "OCCU", value = "value") {
    return { tag, label: tag, date: "", place: "", value };
}

function makeHierarchy() {
    // The only methods we need are the ones already defined on the class —
    // bypass the constructor so we don't need a Configuration stub.
    return Object.create(Hierarchy.prototype);
}

describe("Hierarchy.maxPopulatedOptionalRows()", () => {
    test("returns 0 for a single individual with no optional facts populated", () => {
        const root = person([populatedSlot("BIRT"), null, null, null]);
        expect(makeHierarchy().maxPopulatedOptionalRows(root)).toBe(0);
    });

    test("counts populated optional slots, ignoring the BIRT/DEAT placeholders at index 0/1", () => {
        const root = person([
            populatedSlot("BIRT"),
            populatedSlot("DEAT"),
            populatedSlot("OCCU"),
            null,
            populatedSlot("RESI"),
        ]);
        expect(makeHierarchy().maxPopulatedOptionalRows(root)).toBe(2);
    });

    test("walks the whole pedigree and returns the chart-wide maximum", () => {
        // Focal individual has only 1 optional fact, but a great-grandparent
        // has 4. The chart-wide max wins because all boxes share one bounding
        // rect.
        const sparseFocal = person([null, null, populatedSlot("OCCU"), null, null, null, null]);
        const denseAncestor = person([
            null,
            null,
            populatedSlot("OCCU"),
            populatedSlot("EDUC"),
            populatedSlot("RESI"),
            populatedSlot("RELI"),
            null,
        ]);
        const middleGen = withParents(person([null, null]), [denseAncestor]);
        const root = withParents(sparseFocal, [middleGen]);
        expect(makeHierarchy().maxPopulatedOptionalRows(root)).toBe(4);
    });

    test("returns 0 when no individual has any optional fact", () => {
        const root = withParents(
            person([populatedSlot("BIRT"), populatedSlot("DEAT"), null, null, null]),
            [person([populatedSlot("BIRT"), null, null, null, null])],
        );
        expect(makeHierarchy().maxPopulatedOptionalRows(root)).toBe(0);
    });

    test("handles individuals with no facts array gracefully", () => {
        const root = withParents(person(undefined), [
            person([populatedSlot("BIRT"), null, populatedSlot("OCCU"), populatedSlot("EDUC")]),
        ]);
        expect(makeHierarchy().maxPopulatedOptionalRows(root)).toBe(2);
    });

    test("counts only non-null entries — undefined or missing slots do not inflate the count", () => {
        // factSlots configures 5 optional positions but the data layer
        // only emits as many trailing nulls as the resolver has slots.
        const root = person([
            emptySlot(),
            emptySlot(),
            populatedSlot("OCCU"),
            emptySlot(),
            null,
            null,
            null,
        ]);
        expect(makeHierarchy().maxPopulatedOptionalRows(root)).toBe(1);
    });
});

describe("Hierarchy.treeHasAlternativeNames()", () => {
    function indi(alt = "") {
        return { data: { alternativeName: alt } };
    }
    function withParents(self, parents = []) {
        return { ...self, parents };
    }

    test("returns false when no individual has an alternative name", () => {
        const root = withParents(indi(""), [withParents(indi(""), [indi(""), indi("")])]);
        expect(makeHierarchy().treeHasAlternativeNames(root)).toBe(false);
    });

    test("returns true when the focal individual has an alternative name", () => {
        const root = withParents(indi("Леонора"), [indi(""), indi("")]);
        expect(makeHierarchy().treeHasAlternativeNames(root)).toBe(true);
    });

    test("returns true when only a deep ancestor has an alternative name", () => {
        const root = withParents(indi(""), [
            withParents(indi(""), [withParents(indi(""), [indi("Μαξιμιλιάνα")])]),
        ]);
        expect(makeHierarchy().treeHasAlternativeNames(root)).toBe(true);
    });

    test("treats nodes without a data field as having no alternative name", () => {
        const root = withParents(indi(""), [{ data: undefined, parents: [indi("")] }]);
        expect(makeHierarchy().treeHasAlternativeNames(root)).toBe(false);
    });
});
