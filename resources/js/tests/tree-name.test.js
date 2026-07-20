/**
 * This file is part of the package magicsunday/webtrees-pedigree-chart.
 *
 * For the full copyright and license information, please read the
 * LICENSE file distributed with this source code.
 */

import { jest } from "@jest/globals";

// chart-lib's truncateNames is mocked here so the pedigree-chart unit tests
// can verify the wiring (right call signature, right strategy) without
// double-testing the algorithm — chart-lib has its own jest suite for that.
const truncateNamesMock = jest.fn((names, _availableWidth, measureFn) => {
    measureFn(names.map((n) => n.label).join(" "));
    return names.map((n) => ({ ...n, label: `${n.label.slice(0, 1)}.` }));
});

await jest.unstable_mockModule("@magicsunday/webtrees-chart-lib", () => ({
    measureText: jest.fn(() => 0),
    truncateNames: truncateNamesMock,
}));

const { default: Name } = await import("resources/js/modules/tree/name.js");

/**
 * Builds a Name instance with the minimal collaborator stubs needed to
 * exercise truncateNamesData. measureText is replaced with a deterministic
 * stub (each character costs 10 pixels) so the assertions stay stable.
 */
function makeName(nameAbbreviation = "GIVEN") {
    const name = Object.create(Name.prototype);
    name._svg = { _configuration: { nameAbbreviation } };
    name.measureText = (text) => text.length * 10;
    return name;
}

const buildParent = () => ({
    style: jest.fn((property) => (property === "font-size" ? "12px" : "400")),
});

describe("Name.truncateNamesData", () => {
    beforeEach(() => {
        truncateNamesMock.mockClear();
    });

    it("delegates to chart-lib truncateNames with the GIVEN strategy by default", () => {
        const name = makeName("GIVEN");
        const names = [
            { label: "Anna", isPreferred: false, isLastName: false, isNameRtl: false },
            { label: "Schmidt", isPreferred: false, isLastName: true, isNameRtl: false },
        ];
        const parent = buildParent();

        name.truncateNamesData(parent, names, 100);

        expect(truncateNamesMock).toHaveBeenCalledWith(
            names,
            100,
            expect.any(Function),
            expect.objectContaining({ strategy: "GIVEN", dropEmptyBracketed: true }),
        );
        expect(parent.style).toHaveBeenCalledWith("font-size");
        expect(parent.style).toHaveBeenCalledWith("font-weight");
    });

    it("passes the SURNAME strategy when configured", () => {
        const name = makeName("SURNAME");
        const names = [
            { label: "Jón", isPreferred: true, isLastName: false, isNameRtl: false },
            { label: "Sigurðsson", isPreferred: false, isLastName: true, isNameRtl: false },
        ];

        name.truncateNamesData(buildParent(), names, 60);

        expect(truncateNamesMock).toHaveBeenCalledWith(
            expect.any(Array),
            expect.any(Number),
            expect.any(Function),
            expect.objectContaining({ strategy: "SURNAME" }),
        );
    });

    it("returns the (mocked) chart-lib result", () => {
        const name = makeName();
        const names = [
            { label: "Anna", isPreferred: true, isLastName: false, isNameRtl: false },
            { label: "Schmidt", isPreferred: false, isLastName: true, isNameRtl: false },
        ];

        const result = name.truncateNamesData(buildParent(), names, 60);

        expect(result.map((n) => n.label)).toEqual(["A.", "S."]);
    });
});

/**
 * Builds the datum shape createNamesData() reads.
 *
 * @param {object} data Individual name data
 *
 * @return {object} Hierarchy datum wrapper
 */
function makeDatum(data) {
    return {
        data: {
            data: {
                nickname: "",
                isNameRtl: false,
                ...data,
            },
        },
    };
}

describe("Name.createNamesData", () => {
    it("locates a surname that repeats an earlier given name", () => {
        const name = Object.create(Name.prototype);
        const datum = makeDatum({
            name: "Anna Anna Anna",
            firstNames: ["Anna", "Anna"],
            lastNames: ["Anna"],
            preferredName: "Anna",
        });

        const groups = name.createNamesData(datum);
        const surnames = groups.flat().filter((entry) => entry.isLastName);

        // The surname occupies the third "Anna"; the two earlier ones are given
        // names. Skipping forward past a match must advance to the absolute end
        // of that match, not accumulate absolute indices — otherwise the search
        // overshoots the string and the surname is dropped from the label.
        expect(surnames).toHaveLength(1);
        expect(surnames[0].label).toBe("Anna");
    });

    it("keeps both parts of a surname that repeats itself", () => {
        const name = Object.create(Name.prototype);
        const datum = makeDatum({
            name: "Anna Schmidt Schmidt",
            firstNames: ["Anna"],
            lastNames: ["Schmidt", "Schmidt"],
            preferredName: "Anna",
        });

        const groups = name.createNamesData(datum);
        const surnames = groups.flat().filter((entry) => entry.isLastName);

        // After a match is accepted the search has to resume behind it. Resuming
        // at the match itself makes the next identical surname token find the
        // same position again, so both collapse onto one entry and the second
        // one is lost.
        expect(surnames.map((entry) => entry.label)).toEqual(["Schmidt", "Schmidt"]);
    });

    it("omits a surname that does not occur in the assembled name", () => {
        const name = Object.create(Name.prototype);
        const datum = makeDatum({
            name: "Anna Schmidt",
            firstNames: ["Anna"],
            lastNames: ["Schmidt", "Meier"],
            preferredName: "Anna",
        });

        const groups = name.createNamesData(datum);
        const surnames = groups.flat().filter((entry) => entry.isLastName);

        expect(surnames.map((entry) => entry.label)).toEqual(["Schmidt"]);
    });

    it("skips an empty surname instead of searching for it forever", () => {
        const name = Object.create(Name.prototype);
        const datum = makeDatum({
            name: "Anna Schmidt",
            firstNames: ["Anna"],
            lastNames: ["", "Schmidt"],
            preferredName: "Anna",
        });

        // `indexOf("", offset)` returns `offset` itself, so the skip-forward step
        // advances by the match length of zero and the position never moves. If
        // that position also belongs to a given name the loop cannot terminate
        // and the browser tab hangs. NameProcessor::splitAndCleanName() filters
        // empty parts out today, but that guarantee lives in a separate package
        // (webtrees-module-base), so this unit defends its own input.
        const groups = name.createNamesData(datum);
        const surnames = groups.flat().filter((entry) => entry.isLastName);

        expect(surnames.map((entry) => entry.label)).toEqual(["Schmidt"]);
    }, 5000);
});
