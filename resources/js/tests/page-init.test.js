/**
 * This file is part of the package magicsunday/webtrees-pedigree-chart.
 *
 * For the full copyright and license information, please read the
 * LICENSE file distributed with this source code.
 */

import { jest } from "@jest/globals";

// The storage of chart-lib is covered there. A stand-in that answers from a table keeps
// the test on what the page does with the answers.
const registered = [];
const stored = {};
const published = [];

await jest.unstable_mockModule("@magicsunday/webtrees-chart-lib/chart-core", () => ({
    Storage: class {
        register(name) {
            registered.push(name);
        }

        readBool(name) {
            return stored[name] ?? null;
        }

        readString(name) {
            return stored[name] ?? null;
        }
    },
    buildChartAjaxUrl: () => "https://example.test/chart",
    setChartAjaxUrl: () => {},
    setChartOptionsGlobal: (name, options) => {
        published.push({ name, options });
    },
    syncCollapseToggle: () => {},
}));

const { initPage } = await import("resources/js/modules/page-init.js");

/**
 * Runs the page initialisation against the given stored values.
 *
 * @param {object} values The stored form values by name
 *
 * @return {{name: string, options: object}}
 */
function initWith(values) {
    registered.length = 0;
    published.length = 0;

    for (const key of Object.keys(stored)) {
        delete stored[key];
    }

    Object.assign(stored, values);

    document.body.innerHTML =
        '<form id="webtrees-pedigree-chart-form"><input name="layout" value=""></form>';

    initPage({ ajaxUrl: "https://example.test/chart" });

    return published[0];
}

describe("initPage place and fact options", () => {
    test("restores the two switches with the rest of the form", () => {
        initWith({});

        expect(registered).toContain("showPlaces");
        expect(registered).toContain("showAdditionalFacts");
    });

    test("publishes the stored value of each switch", () => {
        const { name, options } = initWith({ showPlaces: true, showAdditionalFacts: false });

        expect(name).toBe("WebtreesPedigreeChart");
        expect(options.showPlaces).toBe(true);
        expect(options.showAdditionalFacts).toBe(false);
    });

    test("publishes nothing for a switch the visitor never stored, so the server default holds", () => {
        const { options } = initWith({});

        expect(options.showPlaces).toBeNull();
        expect(options.showAdditionalFacts).toBeNull();
    });
});
