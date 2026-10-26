/**
 * This file is part of the package magicsunday/webtrees-pedigree-chart.
 *
 * For the full copyright and license information, please read the
 * LICENSE file distributed with this source code.
 */

import { jest } from "@jest/globals";

// The renderers are covered by chart-lib. Spies stand in for the date and the fact rows
// renderer and for the name renderer, so the test only sees which renderer the drawer picks
// and with which options. The geometry classes stay the real ones.
const appendFacts = jest.fn();
const appendDate = jest.fn();
const appendName = jest.fn();

const actual = await import("@magicsunday/webtrees-chart-lib/linked-tree");

await jest.unstable_mockModule("@magicsunday/webtrees-chart-lib/linked-tree", () => ({
    ...actual,
    DateRenderer: class {
        appendDate = appendDate;
    },
    FactRowsRenderer: class {
        appendFacts = appendFacts;
    },
}));

await jest.unstable_mockModule("resources/js/modules/tree/name.js", () => ({
    default: class {
        appendName = appendName;
    },
}));

const d3 = await import("resources/js/modules/d3.js");
const { default: Configuration } = await import("resources/js/modules/configuration.js");
const { default: NodeDrawer } = await import("resources/js/modules/tree/node-drawer.js");

/**
 * Draws one person box with the given options and returns the selection that was drawn into.
 *
 * @param {string}  layout
 * @param {object}  options
 * @param {boolean} options.alternativeName
 * @param {boolean} options.places
 * @param {boolean} options.additionalFacts
 * @param {number}  options.optionalRows
 * @param {number}  [options.boxHeight] The box height the hierarchy would have set
 *
 * @return {object}
 */
function drawBox(layout, options) {
    document.body.replaceChildren();
    appendFacts.mockClear();
    appendDate.mockClear();
    appendName.mockClear();

    const configuration = new Configuration(
        { zoom: "Zoom", move: "Move" },
        layout,
        true,
        options.alternativeName,
        false,
        "#70a9cf",
        "#d06f94",
        "GIVEN",
        false,
        options.places,
        options.additionalFacts,
        options.optionalRows,
    );

    if (options.boxHeight !== undefined) {
        configuration.orientation.boxHeight = options.boxHeight;
    }

    const root = d3.select(document.body).append("svg");
    const svg = {
        defs: root.append("defs"),
        visual: root.append("g"),
        _configuration: configuration,
    };

    const parent = root
        .selectAll("g.person")
        .data([{ data: { data: { thumbnail: "" } } }])
        .enter()
        .append("g");

    new NodeDrawer(svg, {}, configuration).drawNode(parent);

    return parent;
}

describe("NodeDrawer renderer switch", () => {
    test("draws the single date line while no fact rows are active", () => {
        drawBox("right", {
            alternativeName: false,
            places: false,
            additionalFacts: true,
            optionalRows: 0,
        });

        expect(appendDate).toHaveBeenCalledTimes(1);
        expect(appendFacts).not.toHaveBeenCalled();
        expect(appendName).toHaveBeenCalledTimes(1);
    });

    test("draws the fact rows instead of the date line when places are shown", () => {
        const parent = drawBox("right", {
            alternativeName: false,
            places: true,
            additionalFacts: false,
            optionalRows: 3,
        });

        expect(appendDate).not.toHaveBeenCalled();
        expect(appendFacts).toHaveBeenCalledTimes(1);
        expect(appendFacts).toHaveBeenCalledWith(parent, {
            firstRowY: 15,
            showPlaces: true,
            showOptionalRows: false,
        });
    });

    test("draws the optional rows when the tree names facts and the switch is on", () => {
        const parent = drawBox("right", {
            alternativeName: false,
            places: false,
            additionalFacts: true,
            optionalRows: 2,
        });

        expect(appendDate).not.toHaveBeenCalled();
        expect(appendFacts).toHaveBeenCalledWith(parent, {
            firstRowY: 15,
            showPlaces: false,
            showOptionalRows: true,
        });
    });
});

describe("NodeDrawer first fact row", () => {
    test("starts a vertical box below the image and the name block", () => {
        drawBox("down", {
            alternativeName: false,
            places: true,
            additionalFacts: false,
            optionalRows: 0,
        });

        expect(appendFacts.mock.calls[0][1].firstRowY).toBe(75);
    });

    test("starts a vertical box lower by the alternative name row", () => {
        drawBox("down", {
            alternativeName: true,
            places: true,
            additionalFacts: false,
            optionalRows: 0,
            boxHeight: 205,
        });

        expect(appendFacts.mock.calls[0][1].firstRowY).toBe(90);
    });

    test("starts a horizontal box at the date line of the legacy layout", () => {
        drawBox("left", {
            alternativeName: true,
            places: true,
            additionalFacts: false,
            optionalRows: 0,
        });

        expect(appendFacts.mock.calls[0][1].firstRowY).toBe(15);
    });
});
