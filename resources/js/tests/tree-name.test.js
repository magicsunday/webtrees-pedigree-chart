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

await jest.unstable_mockModule("@magicsunday/webtrees-chart-lib/infra", () => ({
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
 * @param {Array<[string, string, boolean?]>} segments The label, kind and preferred flag of each segment
 * @param {boolean}                          isNameRtl Whether the name is written right to left
 *
 * @return {object} Hierarchy datum wrapper
 */
function makeDatum(segments, isNameRtl = false) {
    return {
        data: {
            data: {
                isNameRtl,
                nameSegments: segments.map(([label, kind, isPreferred = false]) => ({
                    label,
                    kind,
                    isPreferred,
                })),
            },
        },
    };
}

/**
 * Reduces the blocks of createNamesData() to their labels.
 *
 * @param {object[][]} blocks
 *
 * @return {string[][]}
 */
function labelsOf(blocks) {
    return blocks.map((block) => block.map((entry) => entry.label));
}

describe("Name.createNamesData", () => {
    const name = Object.create(Name.prototype);

    it("groups the given names and the surnames into two blocks", () => {
        const blocks = name.createNamesData(
            makeDatum([
                ["Anna", "given"],
                ["Maria", "given"],
                ["Schmidt", "surname"],
            ]),
        );

        expect(labelsOf(blocks)).toEqual([["Anna", "Maria"], ["Schmidt"]]);
    });

    it("keeps the nickname with the given names and the married surname with the surnames", () => {
        const blocks = name.createNamesData(
            makeDatum([
                ["Anna", "given"],
                ['"Annie"', "nickname"],
                ["Schmidt", "surname"],
                ["(Müller)", "married"],
            ]),
        );

        expect(labelsOf(blocks)).toEqual([
            ["Anna", '"Annie"'],
            ["Schmidt", "(Müller)"],
        ]);
    });

    it("follows the order of the segments instead of putting the given names first", () => {
        const blocks = name.createNamesData(
            makeDatum([
                ["Sigurðsson", "surname"],
                ["Jón", "given"],
            ]),
        );

        expect(labelsOf(blocks)).toEqual([["Sigurðsson"], ["Jón"]]);
    });

    it("starts a block of its own for a nickname that follows the surnames", () => {
        const blocks = name.createNamesData(
            makeDatum([
                ["White", "surname"],
                ['"Chalky"', "nickname"],
            ]),
        );

        expect(labelsOf(blocks)).toEqual([["White"], ['"Chalky"']]);
    });

    it("keeps repeated labels apart and in order", () => {
        const blocks = name.createNamesData(
            makeDatum([
                ["Anna", "given"],
                ["Anna", "given"],
                ["Anna", "surname"],
                ["Anna", "surname"],
            ]),
        );

        expect(labelsOf(blocks)).toEqual([
            ["Anna", "Anna"],
            ["Anna", "Anna"],
        ]);
        expect(blocks.map((block) => block.map((entry) => entry.isLastName))).toEqual([
            [false, false],
            [true, true],
        ]);
    });

    it("returns no block for a name without segments", () => {
        expect(name.createNamesData(makeDatum([]))).toEqual([]);
    });

    it("flags every entry for the renderer", () => {
        const [given, surname] = name.createNamesData(
            makeDatum(
                [
                    ["Anna", "given", false],
                    ["Maria", "given", true],
                    ['"Annie"', "nickname"],
                    ["Schmidt", "surname"],
                    ["(Müller)", "married"],
                ],
                true,
            ),
        );

        expect(given).toEqual([
            {
                label: "Anna",
                isPreferred: false,
                isLastName: false,
                isNickname: false,
                isNameRtl: true,
            },
            {
                label: "Maria",
                isPreferred: true,
                isLastName: false,
                isNickname: false,
                isNameRtl: true,
            },
            {
                label: '"Annie"',
                isPreferred: false,
                isLastName: false,
                isNickname: true,
                isNameRtl: true,
            },
        ]);
        expect(surname).toEqual([
            {
                label: "Schmidt",
                isPreferred: false,
                isLastName: true,
                isNickname: false,
                isNameRtl: true,
            },
            {
                label: "(Müller)",
                isPreferred: false,
                isLastName: true,
                isNickname: false,
                isNameRtl: true,
            },
        ]);
    });
});
