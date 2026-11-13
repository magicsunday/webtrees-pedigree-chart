/**
 * This file is part of the package magicsunday/webtrees-pedigree-chart.
 *
 * For the full copyright and license information, please read the
 * LICENSE file distributed with this source code.
 */

import Configuration from "resources/js/modules/configuration.js";

const labels = { zoom: "Zoom", move: "Move" };

describe("Configuration", () => {
    test("hands every passed option to its getter", () => {
        const configuration = new Configuration(
            labels,
            "down",
            false,
            true,
            true,
            "#111111",
            "#222222",
            "SURNAME",
            true,
            true,
        );

        expect(configuration.labels).toBe(labels);
        expect(configuration.openNewTabOnClick).toBe(false);
        expect(configuration.showAlternativeName).toBe(true);
        expect(configuration.showFamilyColors).toBe(true);
        expect(configuration.paternalColor).toBe("#111111");
        expect(configuration.maternalColor).toBe("#222222");
        expect(configuration.nameAbbreviation).toBe("SURNAME");
        expect(configuration.rtl).toBe(true);
        expect(configuration.showDetailPanel).toBe(true);
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
