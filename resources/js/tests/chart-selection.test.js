/**
 * This file is part of the package magicsunday/webtrees-pedigree-chart.
 *
 * For the full copyright and license information, please read the
 * LICENSE file distributed with this source code.
 */

import { jest } from "@jest/globals";

const { default: Chart } = await import("resources/js/modules/chart.js");
const d3 = await import("resources/js/modules/d3.js");

/**
 * Builds a stand-in for a chart that has the pieces the click routing uses.
 *
 * @param {{showDetailPanel?: boolean, panel?: object|null}} options The state of the chart
 */
function buildChart({ showDetailPanel = true, panel = { select: jest.fn() } } = {}) {
    const context = {
        _configuration: { showDetailPanel, openNewTabOnClick: false },
        _detailPanel: panel,
        _selection: {
            select: jest.fn(),
            apply: jest.fn(),
            clear: jest.fn(),
            restoreFocus: jest.fn(),
            makeOperable: jest.fn(),
        },
        redirectToIndividual: jest.fn(),
        update: jest.fn(),
    };

    return { context };
}

const person = (overrides = {}) => ({
    data: {
        xref: "I2",
        url: "/individual/I2",
        updateUrl: "/chart/I2",
        generation: 2,
        ...overrides,
    },
});

describe("Chart click routing", () => {
    test("selects the person for the panel and navigates nowhere", () => {
        const { context } = buildChart();
        const data = person();

        Chart.prototype.personClick.call(context, data);

        expect(context._selection.select).toHaveBeenCalledWith(data);
        expect(context._detailPanel.select).toHaveBeenCalledWith(data.data, false);
        expect(context.update).not.toHaveBeenCalled();
        expect(context.redirectToIndividual).not.toHaveBeenCalled();
    });

    test("selects the root person instead of opening its page", () => {
        const { context } = buildChart();

        Chart.prototype.personClick.call(context, person({ generation: 1 }));

        expect(context._detailPanel.select).toHaveBeenCalledTimes(1);
        expect(context.redirectToIndividual).not.toHaveBeenCalled();
    });

    test("tells the panel when a key triggered the selection", () => {
        const { context } = buildChart();
        const data = person();

        Chart.prototype.personClick.call(context, data, true);

        expect(context._detailPanel.select).toHaveBeenCalledWith(data.data, true);
    });

    test("keeps the placeholder navigation of the add-parent boxes", () => {
        const { context } = buildChart();

        Chart.prototype.personClick.call(context, person({ xref: "", url: "/add-parent" }));

        expect(context.redirectToIndividual).toHaveBeenCalledWith("/add-parent");
        expect(context._detailPanel.select).not.toHaveBeenCalled();
    });

    test("behaves as before with the panel switched off", () => {
        const { context } = buildChart({ showDetailPanel: false });

        Chart.prototype.personClick.call(context, person());
        Chart.prototype.personClick.call(context, person({ generation: 1 }));

        expect(context.update).toHaveBeenCalledWith("/chart/I2");
        expect(context.redirectToIndividual).toHaveBeenCalledWith("/individual/I2");
        expect(context._selection.select).not.toHaveBeenCalled();
    });

    test("behaves as before when the page has no panel element", () => {
        const { context } = buildChart({ panel: null });

        Chart.prototype.personClick.call(context, person());

        expect(context.update).toHaveBeenCalledWith("/chart/I2");
        expect(context._selection.select).not.toHaveBeenCalled();
    });
});

describe("Chart click binding", () => {
    /**
     * Builds a chart stand-in whose person elements are the given data, and records the
     * element that each handler is bound to.
     *
     * @param {boolean} showDetailPanel Whether the panel is on
     * @param {object[]} nodes          The d3 data of the person elements
     */
    function bind(showDetailPanel, nodes) {
        const bound = [];
        const element = { on: jest.fn(() => element) };
        const selection = {
            filter(predicate) {
                return { ...selection, nodes: this.nodes.filter(predicate) };
            },
            each(callback) {
                this.nodes.forEach((node) => callback.call("element", node));
            },
            nodes,
        };
        const context = {
            _configuration: { showDetailPanel },
            _svg: { visual: { selectAll: () => selection } },
            _selection: {
                makeOperable: jest.fn((target, node, activate) =>
                    bound.push([target, node, activate]),
                ),
                apply: jest.fn(),
            },
            personClick: jest.fn(),
        };

        return { context, bound, element };
    }

    const node = (xref, url) => ({ data: { data: { xref, url } } });

    test("makes the selectable persons keyboard operable with the panel on", () => {
        const first = node("I1", "/i/1");
        const { context, bound } = bind(true, [first, node("", "")]);

        Chart.prototype.bindClickEventListener.call(context);

        expect(context._selection.makeOperable).toHaveBeenCalledTimes(1);
        expect(bound[0][1]).toBe(first);
    });

    test("hands the key activation of a person to the click routing", () => {
        const first = node("I1", "/i/1");
        const { context, bound } = bind(true, [first]);

        Chart.prototype.bindClickEventListener.call(context);
        bound[0][2](first.data, true);

        expect(context.personClick).toHaveBeenCalledWith(first.data, true);
    });

    test("leaves the persons as they were with the panel off", () => {
        const { context } = bind(false, [node("I1", "/i/1")]);

        Chart.prototype.bindClickEventListener.call(context);

        expect(context._selection.makeOperable).not.toHaveBeenCalled();
    });

    test("applies the selection again after the persons are bound", () => {
        const { context } = bind(true, [node("I1", "/i/1")]);

        Chart.prototype.bindClickEventListener.call(context);

        expect(context._selection.apply).toHaveBeenCalledTimes(1);
    });
});

describe("Chart click binding with real elements", () => {
    /**
     * Builds an SVG with person groups that carry d3 data, and binds the chart to it.
     *
     * @param {object[]} nodes The d3 data of the person groups
     */
    function bindReal(nodes) {
        document.body.innerHTML = '<svg><g class="visual"></g></svg>';

        const visual = d3.select(document.querySelector("g.visual"));
        const personNodes = visual
            .selectAll("g.person")
            .data(nodes)
            .enter()
            .append("g")
            .attr("class", "person");
        const context = {
            _configuration: { showDetailPanel: false },
            _svg: { visual },
            _selection: { makeOperable: jest.fn(), apply: jest.fn() },
            personClick: jest.fn(),
        };

        Chart.prototype.bindClickEventListener.call(context);

        return { context, elements: personNodes.nodes() };
    }

    // The d3 datum is the hierarchy node, its data is the datum of the chart, and that holds the person
    const node = (xref, url) => ({ data: { data: { xref, url } } });

    test("hands the data of a clicked person to the click routing", () => {
        const first = node("I1", "/i/1");
        const { context, elements } = bindReal([first]);

        elements[0].dispatchEvent(new MouseEvent("click"));

        expect(context.personClick).toHaveBeenCalledTimes(1);
        expect(context.personClick).toHaveBeenCalledWith(first.data);
    });

    test("binds no click to a box that has neither an xref nor a url", () => {
        const { context, elements } = bindReal([node("", "")]);

        elements[0].dispatchEvent(new MouseEvent("click"));

        expect(context.personClick).not.toHaveBeenCalled();
    });
});

describe("Chart selection hand-over", () => {
    test("clears the selection when the panel has closed", () => {
        const { context } = buildChart();

        Chart.prototype.clearSelection.call(context);

        expect(context._selection.clear).toHaveBeenCalledTimes(1);
    });

    test("gives the focus back through the selection", () => {
        const { context } = buildChart();

        Chart.prototype.restoreFocus.call(context);

        expect(context._selection.restoreFocus).toHaveBeenCalledTimes(1);
    });
});
