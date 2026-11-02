/**
 * This file is part of the package magicsunday/webtrees-pedigree-chart.
 *
 * For the full copyright and license information, please read the
 * LICENSE file distributed with this source code.
 */

// The shared truncation is deliberately not mocked here, because the strategy and the
// bracket option of the renderer only have an effect inside it. The grouping and the
// rendering of the name lines are asserted in tree-name-render.test.js.
const { default: Name } = await import("resources/js/modules/tree/name.js");

/**
 * Builds a Name instance with the minimal collaborator stubs needed to exercise
 * truncateNamesData. measureText is replaced with a deterministic stub (each
 * character costs 10 pixels) so the assertions stay stable.
 *
 * @param {string} nameAbbreviation The configured abbreviation strategy
 *
 * @return {Name}
 */
function makeName(nameAbbreviation = "GIVEN") {
    const name = Object.create(Name.prototype);
    name._svg = { _configuration: { nameAbbreviation } };
    name.measureText = (text) => text.length * 10;
    return name;
}

// The font size and the font weight differ and any other property answers a third value, so a
// value read for the wrong property is seen
const FONT_VALUES = { "font-size": "12px", "font-weight": "700" };
const parent = { style: (property) => FONT_VALUES[property] ?? "not-a-font-property" };

/**
 * Builds the label entry that createNamesData hands to the truncation.
 *
 * @param {string}  label      The text of the entry
 * @param {boolean} isLastName Whether the entry belongs to the surname block
 *
 * @return {object}
 */
function entry(label, isLastName = false) {
    return { label, isPreferred: false, isLastName, isNickname: false, isNameRtl: false };
}

describe("Name.truncateNamesData", () => {
    // Representative cases: the strategy decides which block shrinks first (given names
    // for GIVEN, surnames for SURNAME), the bracketed married surname is dropped instead of
    // being shortened to a bare bracket, and names that fit the handed width stay whole.
    it.each([
        {
            scenario: "shortens the given names first for the GIVEN strategy",
            strategy: "GIVEN",
            names: [entry("Anna"), entry("Schmidt", true)],
            width: 100,
            expected: ["A.", "Schmidt"],
        },
        {
            scenario: "shortens the surnames first for the SURNAME strategy",
            strategy: "SURNAME",
            names: [entry("Anna"), entry("Schmidt", true)],
            width: 100,
            expected: ["Anna", "S."],
        },
        {
            scenario: "drops a bracketed married surname instead of shortening it",
            strategy: "GIVEN",
            names: [entry("Anna"), entry("Schmidt", true), entry("(Müller)", true)],
            width: 120,
            expected: ["A.", "Schmidt"],
        },
        {
            scenario: "keeps the names whole when they fit the handed width",
            strategy: "GIVEN",
            names: [entry("Anna"), entry("Schmidt", true)],
            width: 200,
            expected: ["Anna", "Schmidt"],
        },
    ])("$scenario", ({ strategy, names, width, expected }) => {
        const result = makeName(strategy).truncateNamesData(parent, names, width);

        expect(result.map((label) => label.label)).toEqual(expected);
    });

    it("measures the text with the font size and the font weight of the line", () => {
        const name = makeName();
        const measured = [];

        name.measureText = (text, size, weight) => {
            measured.push([size, weight]);

            return text.length * 10;
        };

        name.truncateNamesData(parent, [entry("Anna"), entry("Schmidt", true)], 100);

        expect(measured.length).toBeGreaterThan(0);
        expect(measured).toEqual(measured.map(() => ["12px", "700"]));
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

describe("Name.createNamesData", () => {
    const name = Object.create(Name.prototype);

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
