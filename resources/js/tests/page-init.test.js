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
const restoredChecked = {};

await jest.unstable_mockModule("@magicsunday/webtrees-chart-lib/chart-core", () => ({
    Storage: class {
        register(name) {
            registered.push(name);

            // The real storage puts a stored state back into the checkbox of the form
            if (name in restoredChecked) {
                const input = document.querySelector(`input[type="checkbox"][name="${name}"]`);

                if (input) {
                    input.checked = restoredChecked[name];
                }
            }
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

        for (const name of Object.keys(stored)) {
            delete stored[name];
        }

        for (const name of Object.keys(restoredChecked)) {
            delete restoredChecked[name];
        }

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
    });

    test("sends the stored state of the switch to the server with the chart request", () => {
        stored.showDetailPanel = true;

        initPage({ ajaxUrl: "/ajax" });

        expect(ajaxOptions[0].query).toContainEqual({ key: "showDetailPanel", value: true });
    });

    test("sends a stored off state of the switch to the server as well", () => {
        stored.showDetailPanel = false;

        initPage({ ajaxUrl: "/ajax" });

        expect(ajaxOptions[0].query).toContainEqual({ key: "showDetailPanel", value: false });
    });

    test("leaves the switch out of the chart request while nothing is stored", () => {
        initPage({ ajaxUrl: "/ajax" });

        expect(ajaxOptions[0].query).toContainEqual({ key: "showDetailPanel", value: null });
    });

    test("ignores a stale storage key of a removed switch", () => {
        stored.showPlaces = true;

        initPage({ ajaxUrl: "/ajax" });

        expect(globalThis.WebtreesPedigreeChart.chartOptions).not.toHaveProperty("showPlaces");
    });

    /**
     * Renders the form together with the help button, the help popover and the panel checkbox.
     *
     * @param {boolean} panel Whether the checkbox of the detail panel is ticked
     */
    function renderHelp(panel) {
        document.body.innerHTML =
            '<form id="webtrees-pedigree-chart-form">' +
            `<input type="checkbox" name="showDetailPanel" value="1"${panel ? " checked" : ""}>` +
            "</form>" +
            '<button class="btn-help" aria-expanded="false" aria-controls="pedigree-chart-help-popover">Help</button>' +
            '<div id="pedigree-chart-help-popover" class="help-popover d-none" role="region">' +
            '<div data-help-mode="default" id="help-default"></div>' +
            '<div data-help-mode="panel" id="help-panel" class="d-none"></div>' +
            "</div>";
    }

    test("wires the help button to its popover", () => {
        renderHelp(false);

        initPage({ ajaxUrl: "/ajax" });
        document.querySelector(".btn-help").click();

        expect(
            document.getElementById("pedigree-chart-help-popover").classList.contains("d-none"),
        ).toBe(false);
        expect(document.querySelector(".btn-help").getAttribute("aria-expanded")).toBe("true");
    });

    test("shows the help entries of the detail panel mode that the chart loads with", () => {
        renderHelp(true);

        initPage({ ajaxUrl: "/ajax" });

        expect(document.getElementById("help-panel").classList.contains("d-none")).toBe(false);
        expect(document.getElementById("help-default").classList.contains("d-none")).toBe(true);
    });

    test("shows the help entries of the mode that the stored state restores into the checkbox", () => {
        // The markup renders the checkbox unticked and the storage ticks it, so the help has to follow
        // the restored state and not the state of the markup.
        renderHelp(false);
        restoredChecked.showDetailPanel = true;

        initPage({ ajaxUrl: "/ajax" });

        expect(document.getElementById("help-panel").classList.contains("d-none")).toBe(false);
        expect(document.getElementById("help-default").classList.contains("d-none")).toBe(true);
    });

    test("shows the default help entries while the detail panel is off", () => {
        renderHelp(false);

        initPage({ ajaxUrl: "/ajax" });

        expect(document.getElementById("help-default").classList.contains("d-none")).toBe(false);
        expect(document.getElementById("help-panel").classList.contains("d-none")).toBe(true);
    });
});
