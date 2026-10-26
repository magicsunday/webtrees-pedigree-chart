/**
 * This file is part of the package magicsunday/webtrees-pedigree-chart.
 *
 * For the full copyright and license information, please read the
 * LICENSE file distributed with this source code.
 */

const { default: Configuration } = await import("resources/js/modules/configuration.js");

describe("Configuration showDetailPanel", () => {
    test("is off by default", () => {
        expect(new Configuration({ zoom: "", move: "" }).showDetailPanel).toBe(false);
    });

    test("takes the option as the last constructor argument", () => {
        const configuration = new Configuration(
            { zoom: "", move: "" },
            "left-right",
            false,
            false,
            true,
            "#111111",
            "#222222",
            "SURNAME",
            true,
            true,
        );

        expect(configuration.showDetailPanel).toBe(true);
        expect(configuration.rtl).toBe(true);
        expect(configuration.nameAbbreviation).toBe("SURNAME");
    });
});
