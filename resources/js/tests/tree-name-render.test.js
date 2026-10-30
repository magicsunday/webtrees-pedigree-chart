/**
 * This file is part of the package magicsunday/webtrees-pedigree-chart.
 *
 * For the full copyright and license information, please read the
 * LICENSE file distributed with this source code.
 */

import { jest } from "@jest/globals";

// The truncation itself is covered by chart-lib. An identity stand-in keeps the
// rendered labels equal to the labels the name renderer hands over.
await jest.unstable_mockModule("@magicsunday/webtrees-chart-lib/infra", () => ({
    truncateNames: jest.fn((names) => names),
}));

const d3 = await import("resources/js/modules/d3.js");
const { default: Name } = await import("resources/js/modules/tree/name.js");

const TEXT_BOX = { x: 5, y: 20, width: 200 };
const IMAGE_BOX = { width: 50 };

/**
 * Builds the name part of the person payload from a layout independent
 * description of the person, in the order the name is displayed. A person
 * without given names carries the nickname behind the surnames.
 *
 * @param {object}   person
 * @param {string}   person.name       The assembled full name
 * @param {string[]} person.given      Given-name tokens, particles included
 * @param {string}   [person.preferred] The given-name token that carries the preferred flag
 * @param {string}   [person.nickname]  The nickname without quotes
 * @param {string[]} [person.surnames]  Surname tokens
 * @param {string}   [person.married]   The bracketed married surname
 *
 * @return {object}
 */
function buildNameData(person) {
    const given = person.given.map((label) => ({
        label,
        kind: "given",
        isPreferred: label === person.preferred,
    }));
    const surnames = (person.surnames ?? []).map((label) => ({
        label,
        kind: "surname",
        isPreferred: false,
    }));
    const nickname =
        (person.nickname ?? "") === ""
            ? []
            : [{ label: `"${person.nickname}"`, kind: "nickname", isPreferred: false }];
    const married =
        (person.married ?? "") === ""
            ? []
            : [{ label: person.married, kind: "married", isPreferred: false }];

    return {
        name: person.name,
        nameSegments:
            given.length === 0
                ? [...surnames, ...nickname, ...married]
                : [...given, ...nickname, ...surnames, ...married],
    };
}

/**
 * Draws the name of one person and summarises every produced <text> element.
 *
 * @param {object}  person                     The layout independent person description
 * @param {object}  [options]
 * @param {boolean} [options.vertical]         Draw the top/bottom layout
 * @param {boolean} [options.documentRtl]      The document direction is right to left
 * @param {boolean} [options.isNameRtl]        The name is written right to left
 * @param {boolean} [options.isAltRtl]         The alternative name is written right to left
 * @param {string}  [options.alternativeName]  The alternative name
 * @param {string}  [options.thumbnail]        The thumbnail URL
 *
 * @return {object[]}
 */
function drawName(person, options = {}) {
    document.body.replaceChildren();

    const name = new Name(
        {
            _configuration: { showAlternativeName: true, nameAbbreviation: "GIVEN" },
            style: () => "sans-serif",
        },
        { isVertical: options.vertical ?? true, isDocumentRtl: options.documentRtl ?? false },
        IMAGE_BOX,
        TEXT_BOX,
    );

    const parent = d3
        .select(document.body)
        .append("svg")
        .selectAll("g")
        .data([
            {
                data: {
                    data: {
                        ...buildNameData(person),
                        isNameRtl: options.isNameRtl ?? false,
                        isAltRtl: options.isAltRtl ?? false,
                        alternativeName: options.alternativeName ?? "",
                        thumbnail: options.thumbnail ?? "",
                    },
                },
            },
        ])
        .enter()
        .append("g");

    name.appendName(parent);

    return [...document.querySelectorAll("svg text")].map((text) => ({
        class: text.getAttribute("class"),
        direction: text.getAttribute("direction"),
        anchor: text.getAttribute("text-anchor"),
        x: text.getAttribute("x"),
        y: text.getAttribute("y"),
        tspans: [...text.querySelectorAll("tspan")].map((tspan) => ({
            text: tspan.textContent,
            dx: tspan.getAttribute("dx"),
            underline: tspan.getAttribute("text-decoration") === "underline",
            lastName: tspan.classList.contains("lastName"),
        })),
    }));
}

/**
 * Reduces a summarised <text> element to its labels.
 *
 * @param {object} text
 *
 * @return {string[]}
 */
function labels(text) {
    return text.tspans.map((tspan) => tspan.text);
}

const SCHMIDT = { name: "Anna Schmidt", given: ["Anna"], surnames: ["Schmidt"] };

describe("Name rendering in the top/bottom layout", () => {
    it("draws the given names and the surnames on two centred lines", () => {
        const texts = drawName(SCHMIDT);

        expect(texts).toHaveLength(2);
        expect(texts.map(labels)).toEqual([["Anna"], ["Schmidt"]]);
        expect(texts.map((text) => text.y)).toEqual(["10", "30"]);

        for (const text of texts) {
            expect(text.class).toBe("wt-chart-box-name");
            expect(text.anchor).toBe("middle");
            expect(text.direction).toBe("ltr");
        }

        expect(texts[0].tspans[0].lastName).toBe(false);
        expect(texts[1].tspans[0].lastName).toBe(true);
    });

    it("spaces every label but the first of a line", () => {
        const texts = drawName({
            name: "Anna Maria Schmidt Meier",
            given: ["Anna", "Maria"],
            surnames: ["Schmidt", "Meier"],
        });

        expect(texts.map(labels)).toEqual([
            ["Anna", "Maria"],
            ["Schmidt", "Meier"],
        ]);
        expect(texts[0].tspans.map((tspan) => tspan.dx)).toEqual([null, "0.25em"]);
        expect(texts[1].tspans.map((tspan) => tspan.dx)).toEqual([null, "0.25em"]);
    });

    it("keeps a particle in the given-name line", () => {
        const texts = drawName({
            name: "Ludwig van Beethoven",
            given: ["Ludwig", "van"],
            surnames: ["Beethoven"],
        });

        expect(texts.map(labels)).toEqual([["Ludwig", "van"], ["Beethoven"]]);
        expect(texts[0].tspans.every((tspan) => !tspan.lastName)).toBe(true);
    });

    it("places the quoted nickname behind the given names", () => {
        const texts = drawName({
            name: 'Martin "Chalky" White',
            given: ["Martin"],
            nickname: "Chalky",
            surnames: ["White"],
        });

        expect(texts.map(labels)).toEqual([["Martin", '"Chalky"'], ["White"]]);
        expect(texts[0].tspans.map((tspan) => tspan.lastName)).toEqual([false, false]);
    });

    it("draws the nickname of a person without given names behind the surname", () => {
        const texts = drawName({
            name: 'White "Chalky"',
            given: [],
            nickname: "Chalky",
            surnames: ["White"],
        });

        expect(texts.map(labels)).toEqual([["White"], ['"Chalky"']]);
    });

    it("draws a bracketed married surname in the surname line", () => {
        const texts = drawName({
            name: "Anna Schmidt (Müller)",
            given: ["Anna"],
            surnames: ["Schmidt"],
            married: "(Müller)",
        });

        expect(texts.map(labels)).toEqual([["Anna"], ["Schmidt", "(Müller)"]]);
        expect(texts[1].tspans.map((tspan) => tspan.lastName)).toEqual([true, true]);
    });

    it("underlines the preferred given name only", () => {
        const texts = drawName({
            name: "Anna Maria Schmidt",
            given: ["Anna", "Maria"],
            preferred: "Maria",
            surnames: ["Schmidt"],
        });

        expect(texts[0].tspans.map((tspan) => tspan.underline)).toEqual([false, true]);
        expect(texts[1].tspans.map((tspan) => tspan.underline)).toEqual([false]);
    });

    it("draws a name that has no preferred given name without underline", () => {
        const texts = drawName(SCHMIDT);

        expect(texts.flatMap((text) => text.tspans).some((tspan) => tspan.underline)).toBe(false);
    });

    it("keeps a surname that repeats a given name apart from it", () => {
        const texts = drawName({
            name: "Anna Anna Anna",
            given: ["Anna", "Anna"],
            surnames: ["Anna"],
        });

        expect(texts.map(labels)).toEqual([["Anna", "Anna"], ["Anna"]]);
        expect(texts[1].tspans[0].lastName).toBe(true);
    });

    it("keeps both parts of a surname that repeats itself", () => {
        const texts = drawName({
            name: "Anna Schmidt Schmidt",
            given: ["Anna"],
            surnames: ["Schmidt", "Schmidt"],
        });

        expect(texts.map(labels)).toEqual([["Anna"], ["Schmidt", "Schmidt"]]);
    });

    it("draws the surnames in the order of the assembled name", () => {
        const texts = drawName({
            name: "Anna Meier Schmidt",
            given: ["Anna"],
            surnames: ["Meier", "Schmidt"],
        });

        expect(texts.map(labels)).toEqual([["Anna"], ["Meier", "Schmidt"]]);
    });

    it("marks the labels of a right to left name for the reverse spacing", () => {
        const texts = drawName(SCHMIDT, { isNameRtl: true });

        expect(texts[0].direction).toBe("rtl");
        expect(texts[0].anchor).toBe("middle");

        const spaced = drawName(
            { name: "Anna Maria Schmidt", given: ["Anna", "Maria"], surnames: ["Schmidt"] },
            { isNameRtl: true },
        );

        expect(spaced[0].tspans.map((tspan) => tspan.dx)).toEqual([null, "-0.25em"]);
    });

    it("draws the alternative name below the name as one label per word", () => {
        const texts = drawName(SCHMIDT, { alternativeName: "Anna Maria Meier" });

        expect(texts).toHaveLength(3);
        expect(labels(texts[2])).toEqual(["Anna", "Maria", "Meier"]);
        expect(texts[2].class).toBe("wt-chart-box-name");
        expect(texts[2].anchor).toBe("middle");
        expect(texts[2].direction).toBe("ltr");
        expect(texts[2].y).toBe("55");
        expect(texts[2].x).toBeNull();
        expect(texts[2].tspans.map((tspan) => tspan.dx)).toEqual([null, "0.25em", "0.25em"]);
        expect(texts[2].tspans.some((tspan) => tspan.lastName || tspan.underline)).toBe(false);
    });

    it("draws a right to left alternative name with reverse spacing", () => {
        const texts = drawName(SCHMIDT, { alternativeName: "אנה מאיר", isAltRtl: true });

        expect(texts[2].direction).toBe("rtl");
        expect(texts[2].tspans.map((tspan) => tspan.dx)).toEqual([null, "-0.25em"]);
    });

    it("draws no alternative name line when there is none", () => {
        expect(drawName(SCHMIDT)).toHaveLength(2);
    });

    it("draws a name that has only surnames on a single line", () => {
        const texts = drawName({ name: "Schmidt", given: [], surnames: ["Schmidt"] });

        expect(texts).toHaveLength(1);
        expect(labels(texts[0])).toEqual(["Schmidt"]);
        expect(texts[0].y).toBe("10");
        expect(texts[0].tspans[0].lastName).toBe(true);
    });

    it("draws a name that has only given names on a single line", () => {
        const texts = drawName({ name: "Anna Maria", given: ["Anna", "Maria"] });

        expect(texts).toHaveLength(1);
        expect(labels(texts[0])).toEqual(["Anna", "Maria"]);
        expect(texts[0].y).toBe("10");
        expect(texts[0].tspans.some((tspan) => tspan.lastName)).toBe(false);
    });

    it("draws no name line for a name without segments", () => {
        expect(drawName({ name: "", given: [] })).toEqual([]);
    });
});

describe("Name rendering in the left/right layout", () => {
    it("draws the whole name in one line", () => {
        const texts = drawName(
            {
                name: 'Martin "Chalky" White',
                given: ["Martin"],
                nickname: "Chalky",
                surnames: ["White"],
            },
            { vertical: false },
        );

        expect(texts).toHaveLength(1);
        expect(labels(texts[0])).toEqual(["Martin", '"Chalky"', "White"]);
        expect(texts[0].tspans.map((tspan) => tspan.lastName)).toEqual([false, false, true]);
        expect(texts[0].anchor).toBe("start");
        expect(texts[0].y).toBe("10");
    });

    it("draws the nickname of a person without given names behind the surname", () => {
        const texts = drawName(
            { name: 'White "Chalky"', given: [], nickname: "Chalky", surnames: ["White"] },
            { vertical: false },
        );

        expect(labels(texts[0])).toEqual(["White", '"Chalky"']);
    });

    it("underlines the preferred given name", () => {
        const texts = drawName(
            {
                name: "Anna Maria Schmidt",
                given: ["Anna", "Maria"],
                preferred: "Maria",
                surnames: ["Schmidt"],
            },
            { vertical: false },
        );

        expect(texts[0].tspans.map((tspan) => tspan.underline)).toEqual([false, true, false]);
    });

    it("keeps repeated labels apart", () => {
        const texts = drawName(
            { name: "Anna Anna Anna", given: ["Anna", "Anna"], surnames: ["Anna"] },
            { vertical: false },
        );

        expect(labels(texts[0])).toEqual(["Anna", "Anna", "Anna"]);
        expect(texts[0].tspans.map((tspan) => tspan.lastName)).toEqual([false, false, true]);
    });

    it("shifts the text by the width of the thumbnail", () => {
        const withImage = drawName(SCHMIDT, { vertical: false, thumbnail: "image.jpg" });
        const withoutImage = drawName(SCHMIDT, { vertical: false });

        expect(withImage[0].x).toBe("55");
        expect(withoutImage[0].x).toBe("5");
    });

    it("anchors the text at the end for a right to left name", () => {
        const texts = drawName(SCHMIDT, { vertical: false, isNameRtl: true });

        expect(texts[0].direction).toBe("rtl");
        expect(texts[0].anchor).toBe("end");
        expect(texts[0].x).toBe("5");
    });

    it("mirrors the position and the anchor in a right to left document", () => {
        const texts = drawName(SCHMIDT, {
            vertical: false,
            documentRtl: true,
            thumbnail: "image.jpg",
        });

        expect(texts[0].anchor).toBe("end");
        expect(texts[0].x).toBe("-55");
    });

    it("anchors a right to left name at the start in a right to left document", () => {
        const texts = drawName(SCHMIDT, { vertical: false, documentRtl: true, isNameRtl: true });

        expect(texts[0].anchor).toBe("start");
    });

    it("draws the alternative name below the name with its own position", () => {
        const texts = drawName(SCHMIDT, {
            vertical: false,
            alternativeName: "Anna Maria Meier",
            thumbnail: "image.jpg",
        });

        expect(texts).toHaveLength(2);
        expect(labels(texts[1])).toEqual(["Anna", "Maria", "Meier"]);
        expect(texts[1].class).toBe("wt-chart-box-name");
        expect(texts[1].anchor).toBe("start");
        expect(texts[1].direction).toBe("ltr");
        expect(texts[1].x).toBe("55");
        expect(texts[1].y).toBe("28");
    });

    it("anchors a right to left alternative name at the end", () => {
        const texts = drawName(SCHMIDT, {
            vertical: false,
            alternativeName: "אנה מאיר",
            isAltRtl: true,
        });

        expect(texts[1].direction).toBe("rtl");
        expect(texts[1].anchor).toBe("end");
        expect(texts[1].tspans.map((tspan) => tspan.dx)).toEqual([null, "-0.25em"]);
    });

    it("anchors a right to left alternative name at the start in a right to left document", () => {
        const texts = drawName(SCHMIDT, {
            vertical: false,
            documentRtl: true,
            alternativeName: "אנה מאיר",
            isAltRtl: true,
        });

        expect(texts[1].anchor).toBe("start");
        expect(texts[1].x).toBe("-5");
    });
});
