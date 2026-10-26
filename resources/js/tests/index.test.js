/**
 * This file is part of the package magicsunday/webtrees-pedigree-chart.
 *
 * For the full copyright and license information, please read the
 * LICENSE file distributed with this source code.
 */

import { jest } from "@jest/globals";

// The chart itself is covered elsewhere. A stand-in records the configuration that the
// application builds from its options, which is all this test looks at.
const configurations = [];

await jest.unstable_mockModule("resources/js/modules/chart.js", () => ({
    default: class {
        constructor(_parent, configuration) {
            configurations.push(configuration);
        }

        draw() {}
    },
}));

const { PedigreeChart } = await import("resources/js/modules/index.js");

Object.defineProperty(window.screen, "orientation", {
    value: { addEventListener: () => {} },
    configurable: true,
});

/**
 * Builds the application with the options of a chart and returns its configuration.
 *
 * @param {object} overrides Options that replace the defaults of the test
 *
 * @return {object}
 */
function configurationOf(overrides) {
    document.body.innerHTML = '<div id="chart"></div>';
    configurations.length = 0;

    const chart = new PedigreeChart("#chart", {
        labels: { zoom: "Zoom", move: "Move" },
        rtl: false,
        treeLayout: "right",
        openNewTabOnClick: true,
        showAlternativeName: false,
        showFamilyColors: false,
        paternalColor: "#70a9cf",
        maternalColor: "#d06f94",
        nameAbbreviation: "GIVEN",
        cssFiles: [],
        data: { parents: [] },
        ...overrides,
    });

    return chart.configuration;
}

describe("PedigreeChart options", () => {
    test("hands the place switch over as the place switch", () => {
        const configuration = configurationOf({
            showPlaces: true,
            showAdditionalFacts: false,
            optionalRows: 2,
        });

        expect(configuration.showPlaces).toBe(true);
        expect(configuration.showOptionalRows).toBe(false);
        expect(configuration.factLayout).toEqual({ showPlaces: true, optionalRows: 0 });
    });

    test("hands the fact switch and the number of optional rows over as such", () => {
        const configuration = configurationOf({
            showPlaces: false,
            showAdditionalFacts: true,
            optionalRows: 2,
        });

        expect(configuration.showPlaces).toBe(false);
        expect(configuration.showOptionalRows).toBe(true);
        expect(configuration.factLayout).toEqual({ showPlaces: false, optionalRows: 2 });
    });

    test("keeps the date line when the options name no fact rows", () => {
        const configuration = configurationOf({});

        expect(configuration.showFactRows).toBe(false);
        expect(configuration.factLayout).toBeNull();
    });

    test("keeps the order of the options that were there before", () => {
        const configuration = configurationOf({ nameAbbreviation: "SURNAME", rtl: true });

        expect(configuration.nameAbbreviation).toBe("SURNAME");
        expect(configuration.rtl).toBe(true);
        expect(configuration.showAlternativeName).toBe(false);
    });
});
