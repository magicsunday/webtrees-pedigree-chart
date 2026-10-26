/**
 * This file is part of the package magicsunday/webtrees-pedigree-chart.
 *
 * For the full copyright and license information, please read the
 * LICENSE file distributed with this source code.
 */

import { jest } from "@jest/globals";

// The chart and the panel are covered elsewhere. Stand-ins record how the application connects them.
const charts = [];
const panels = [];

await jest.unstable_mockModule("resources/js/modules/chart.js", () => ({
    default: class {
        constructor(_parent, configuration) {
            this.configuration = configuration;
            this.detailPanel = null;
            this.restoreFocus = jest.fn();
            this.clearSelection = jest.fn();
            this.redirectToIndividual = jest.fn();
            this.update = jest.fn();
            charts.push(this);
        }

        draw() {
            this.drawnWithPanel = panels.length > 0 && panels[0].enabled;
        }
    },
}));

await jest.unstable_mockModule("@magicsunday/webtrees-chart-lib/chart-core", () => ({
    DetailPanel: class {
        constructor(element, callbacks) {
            this.element = element;
            this.callbacks = callbacks;
            this.enabled = false;
            panels.push(this);
        }

        enable() {
            this.enabled = true;
        }
    },
}));

const { PedigreeChart } = await import("resources/js/modules/index.js");

Object.defineProperty(window.screen, "orientation", {
    value: { addEventListener: () => {} },
    configurable: true,
});

/**
 * Builds the application with the options of a chart.
 *
 * @param {object}  overrides  Options that replace the defaults of the test
 * @param {boolean} withPanel  Whether the page has the panel element
 */
function build(overrides = {}, withPanel = true) {
    document.body.innerHTML =
        '<div id="chart"></div>' +
        (withPanel ? '<aside id="webtrees-pedigree-detail-panel"></aside>' : "");
    charts.length = 0;
    panels.length = 0;

    const application = new PedigreeChart("#chart", {
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

    return application;
}

describe("PedigreeChart detail panel", () => {
    test("hands the option to the configuration without moving the options before it", () => {
        const application = build({
            showDetailPanel: true,
            nameAbbreviation: "SURNAME",
            rtl: true,
        });

        expect(application.configuration.showDetailPanel).toBe(true);
        expect(application.configuration.nameAbbreviation).toBe("SURNAME");
        expect(application.configuration.rtl).toBe(true);
    });

    test("creates no panel while the option is off", () => {
        build({ showDetailPanel: false });

        expect(panels).toHaveLength(0);
        expect(charts[0].detailPanel).toBeNull();
    });

    test("creates no panel when the page has no panel element", () => {
        build({ showDetailPanel: true }, false);

        expect(panels).toHaveLength(0);
    });

    test("enables the panel and hands it to the chart before the first draw", () => {
        build({ showDetailPanel: true });

        expect(panels).toHaveLength(1);
        expect(panels[0].enabled).toBe(true);
        expect(charts[0].detailPanel).toBe(panels[0]);
        expect(charts[0].drawnWithPanel).toBe(true);
    });

    test("connects the actions of the panel with the chart", () => {
        build({ showDetailPanel: true });

        panels[0].callbacks.onIndividual("/individual/I1");
        panels[0].callbacks.onCenter("/chart/I1");
        panels[0].callbacks.onClose();
        panels[0].callbacks.onHidden();

        expect(charts[0].redirectToIndividual).toHaveBeenCalledWith("/individual/I1");
        expect(charts[0].update).toHaveBeenCalledWith("/chart/I1");
        expect(charts[0].restoreFocus).toHaveBeenCalledTimes(1);
        expect(charts[0].clearSelection).toHaveBeenCalledTimes(1);
    });
});
