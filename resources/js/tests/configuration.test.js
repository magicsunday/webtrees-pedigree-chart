/**
 * This file is part of the package magicsunday/webtrees-pedigree-chart.
 *
 * For the full copyright and license information, please read the
 * LICENSE file distributed with this source code.
 */

import Configuration from "resources/js/modules/configuration.js";

const labels = { zoom: "Zoom", move: "Move" };

// The switches of the constructor in the order of its parameters, after the labels and the layout.
const switches = [
    "openNewTabOnClick",
    "showAlternativeName",
    "showFamilyColors",
    "rtl",
    "showDetailPanel",
];

/**
 * Builds a configuration in which exactly one switch is on, so that every switch has a pattern of its own.
 *
 * @param {string} enabled The switch that is on
 *
 * @return {Configuration}
 */
function buildWithOnly(enabled) {
    const on = (name) => name === enabled;

    return new Configuration(
        labels,
        "down",
        on("openNewTabOnClick"),
        on("showAlternativeName"),
        on("showFamilyColors"),
        "#111111",
        "#222222",
        "SURNAME",
        on("rtl"),
        on("showDetailPanel"),
    );
}

describe("Configuration", () => {
    test("hands the labels, the layout, the colors and the name abbreviation to their getters", () => {
        const configuration = buildWithOnly("rtl");

        expect(configuration.labels).toBe(labels);
        expect(configuration.treeLayout).toBe("down");
        expect(configuration.orientation).toBeDefined();
        expect(configuration.paternalColor).toBe("#111111");
        expect(configuration.maternalColor).toBe("#222222");
        expect(configuration.nameAbbreviation).toBe("SURNAME");
    });

    test.each(switches)("hands the switch %s to its own getter and to no other", (enabled) => {
        const configuration = buildWithOnly(enabled);

        for (const name of switches) {
            expect(configuration[name]).toBe(name === enabled);
        }
    });

    test("owns no default for an omitted option, PHP is the only source", () => {
        const configuration = new Configuration(labels);

        expect(configuration.showAlternativeName).toBeUndefined();
        expect(configuration.showFamilyColors).toBeUndefined();
        expect(configuration.openNewTabOnClick).toBeUndefined();
        expect(configuration.paternalColor).toBeUndefined();
        expect(configuration.maternalColor).toBeUndefined();
        expect(configuration.nameAbbreviation).toBeUndefined();
        expect(configuration.rtl).toBeUndefined();
        expect(configuration.showDetailPanel).toBeUndefined();
    });
});
