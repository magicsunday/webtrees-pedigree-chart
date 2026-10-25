/**
 * This file is part of the package magicsunday/webtrees-pedigree-chart.
 *
 * For the full copyright and license information, please read the
 * LICENSE file distributed with this source code.
 */

import { jest } from "@jest/globals";

await jest.unstable_mockModule("@magicsunday/webtrees-chart-lib/infra", () => ({
    truncateNames: jest.fn((names) => names),
}));

const d3 = await import("resources/js/modules/d3.js");
const { default: Name } = await import("resources/js/modules/tree/name.js");

const TEXT_BOX = { y: 10, width: 100 };

/**
 * Draws the name renderer into a fresh SVG with a single person datum and returns
 * the <text> elements it appended.
 *
 * @param {Function} draw Receives the parent selection and appends the renderer output
 *
 * @return {Element[]}
 */
function drawTexts(draw) {
    document.body.replaceChildren();

    const parent = d3
        .select(document.body)
        .append("svg")
        .selectAll("g")
        .data([
            {
                data: {
                    data: {
                        isNameRtl: false,
                        isAltRtl: false,
                        alternativeName: "Alt Name",
                        timespan: "1900-1980",
                    },
                },
            },
        ])
        .enter()
        .append("g");

    draw(parent);

    return [...document.querySelectorAll("svg text")];
}

/**
 * Builds a Name renderer for a vertical layout with the collaborators that
 * would measure or truncate text stubbed out.
 */
function makeName() {
    const name = new Name(
        { _configuration: { showAlternativeName: true } },
        { isVertical: true },
        {},
        TEXT_BOX,
    );

    name.createNamesData = () => [[{ label: "A" }]];
    name.createAlternativeNamesData = () => [];
    name.getAvailableWidth = () => 100;
    name.truncateNamesData = () => [];
    name.addNameElements = () => {};

    return name;
}

describe("vertical layout text baseline", () => {
    test("centres the names, including the alternative name, through dominant-baseline", () => {
        const name = makeName();
        const texts = drawTexts((parent) => name.appendName(parent));

        // A silent zero must fail, so something has to have been drawn
        expect(texts.length).toBeGreaterThan(0);

        for (const text of texts) {
            expect(text.getAttribute("dominant-baseline")).toBe("central");
            expect(text.hasAttribute("alignment-baseline")).toBe(false);
        }
    });
});
