/**
 * This file is part of the package magicsunday/webtrees-pedigree-chart.
 *
 * For the full copyright and license information, please read the
 * LICENSE file distributed with this source code.
 */

import { jest } from "@jest/globals";

const registered = [];
const ajaxOptions = [];
const stored = {};

await jest.unstable_mockModule("@magicsunday/webtrees-chart-lib/chart-core", () => ({
    Storage: class {
        register(name) {
            registered.push(name);
        }

        readBool(name) {
            return name in stored ? stored[name] : null;
        }

        readString(name) {
            return name in stored ? stored[name] : null;
        }
    },
    syncCollapseToggle: () => {},
    buildChartAjaxUrl: (url, options) => {
        ajaxOptions.push(options);

        return url;
    },
    setChartAjaxUrl: () => {},
    setChartOptionsGlobal: (name, options) => {
        globalThis[name] = { chartOptions: options };
    },
}));

const { initPage } = await import("resources/js/modules/page-init.js");

describe("initPage", () => {
    beforeEach(() => {
        registered.length = 0;
        ajaxOptions.length = 0;
        document.body.innerHTML = '<form id="webtrees-pedigree-chart-form"></form>';
    });

    test("registers the detail panel switch and none of the former fact switches", () => {
        initPage({ ajaxUrl: "/ajax" });

        expect(registered).toContain("showDetailPanel");
        expect(registered).not.toContain("showPlaces");
        expect(registered).not.toContain("showAdditionalFacts");
    });

    test("does not publish the switch, because the server reads the facts and its value decides", () => {
        stored.showDetailPanel = true;

        initPage({ ajaxUrl: "/ajax" });

        expect(globalThis.WebtreesPedigreeChart.chartOptions).not.toHaveProperty("showDetailPanel");

        delete stored.showDetailPanel;
    });

    test("sends the stored state of the switch to the server with the chart request", () => {
        stored.showDetailPanel = true;

        initPage({ ajaxUrl: "/ajax" });

        expect(ajaxOptions[0].query).toContainEqual({ key: "showDetailPanel", value: true });

        delete stored.showDetailPanel;
    });

    test("leaves the switch out of the chart request while nothing is stored", () => {
        initPage({ ajaxUrl: "/ajax" });

        expect(ajaxOptions[0].query).toContainEqual({ key: "showDetailPanel", value: null });
    });

    test("ignores a stale storage key of a removed switch", () => {
        stored.showPlaces = true;

        initPage({ ajaxUrl: "/ajax" });

        expect(globalThis.WebtreesPedigreeChart.chartOptions).not.toHaveProperty("showPlaces");

        delete stored.showPlaces;
    });
});
