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
    function bind(showDetailPanel, nodes, elements = []) {
        const bound = [];
        const element = { on: jest.fn(() => element) };
        const selection = {
            filter(predicate) {
                return { ...selection, nodes: this.nodes.filter(predicate) };
            },
            each(callback) {
                this.nodes.forEach((node, index) =>
                    callback.call(elements[index] ?? "element", node),
                );
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

    /**
     * Builds a person element like the chart draws it: a title with the name, then one text per
     * line of the box, each with a tspan and a title of its own.
     *
     * @param {(string|string[])[]} lines The visible lines of the box, a line with several tspans is an array
     *
     * @return {SVGGElement}
     */
    function personElement(lines) {
        const ns = "http://www.w3.org/2000/svg";
        const element = document.createElementNS(ns, "g");

        lines.forEach((line) => {
            const text = document.createElementNS(ns, "text");
            const title = document.createElementNS(ns, "title");

            // A line is one tspan, or several like the horizontal layouts draw the name parts
            [line].flat().forEach((part) => {
                const tspan = document.createElementNS(ns, "tspan");

                tspan.textContent = part;
                text.append(tspan);
            });

            title.textContent = [line].flat().join(" ");
            text.append(title);
            element.append(text);
        });

        return element;
    }

    test("labels an operable person with the text that the box shows", () => {
        // The chart library labels the element with the bare name, while the box shows the
        // dates as well, so the accessible name would not contain the visible text (WCAG 2.5.3).
        const element = personElement(["Jane", "Doe", "Born: 1850"]);
        const { context } = bind(true, [node("I1", "/i/1")], [element]);

        context._selection.makeOperable.mockImplementation((target) =>
            target.attr("tabindex", 0).attr("role", "button").attr("aria-label", "Jane Doe"),
        );

        Chart.prototype.bindClickEventListener.call(context);

        expect(element.getAttribute("role")).toBe("button");
        expect(element.getAttribute("tabindex")).toBe("0");
        expect(element.getAttribute("aria-label")).toBe("Jane Doe Born: 1850");
    });

    test("separates the tspans of one line in the label", () => {
        // The horizontal layouts draw the parts of a name as tspans of one text
        const element = personElement([["Jane", "Doe"], "Born: 1850"]);
        const { context } = bind(true, [node("I1", "/i/1")], [element]);

        context._selection.makeOperable.mockImplementation((target) =>
            target.attr("aria-label", "Jane Doe"),
        );

        Chart.prototype.bindClickEventListener.call(context);

        expect(element.getAttribute("aria-label")).toBe("Jane Doe Born: 1850");
    });

    test("keeps the label of the chart library for a box without visible text", () => {
        const element = personElement([]);
        const { context } = bind(true, [node("I1", "/i/1")], [element]);

        context._selection.makeOperable.mockImplementation((target) =>
            target.attr("aria-label", "Jane Doe"),
        );

        Chart.prototype.bindClickEventListener.call(context);

        expect(element.getAttribute("aria-label")).toBe("Jane Doe");
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
     * @param {object[]} nodes           The d3 data of the person groups
     * @param {boolean}  showDetailPanel Whether the panel is on
     */
    function bindReal(nodes, showDetailPanel = false) {
        document.body.innerHTML = '<svg><g class="visual"></g></svg>';

        const visual = d3.select(document.querySelector("g.visual"));
        const personNodes = visual
            .selectAll("g.person")
            .data(nodes)
            .enter()
            .append("g")
            .attr("class", "person");
        const context = {
            _configuration: { showDetailPanel },
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

    test("hands the data of a clicked person to the click routing with the panel on", () => {
        const first = node("I1", "/i/1");
        const { context, elements } = bindReal([first], true);

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

describe("A real chart with the detail panel", () => {
    // The d3 datum is the hierarchy node, its data is the datum of the chart, and that holds the person
    const node = (xref) => ({
        data: { data: { xref, url: `/individual/${xref}`, generation: 2 } },
    });

    /**
     * Builds a real chart whose persons are real SVG groups that carry d3 data.
     *
     * @param {object[]} nodes The d3 data of the person groups
     */
    function buildRealChart(nodes) {
        document.body.innerHTML = '<div id="parent"></div><svg><g class="visual"></g></svg>';

        const visual = d3.select(document.querySelector("g.visual"));
        const elements = visual
            .selectAll("g.person")
            .data(nodes)
            .enter()
            .append("g")
            .attr("class", "person")
            .nodes();
        const chart = new Chart(d3.select("#parent"), {
            showDetailPanel: true,
            openNewTabOnClick: false,
        });

        chart._svg = { visual };

        return { chart, elements };
    }

    test("hands the clicked person to the panel that was set on the chart", () => {
        const first = node("I1");
        const { chart } = buildRealChart([first]);
        const panel = { select: jest.fn() };

        chart.detailPanel = panel;
        chart.personClick(first.data);

        expect(panel.select).toHaveBeenCalledTimes(1);
        expect(panel.select.mock.calls[0][0].xref).toBe("I1");
    });

    test("marks the selected person in the drawn chart and no other one", () => {
        const first = node("I1");
        const second = node("I2");
        const { chart, elements } = buildRealChart([first, second]);

        chart.detailPanel = { select: jest.fn() };
        chart.personClick(second.data);

        expect(elements[0].classList.contains("selected")).toBe(false);
        expect(elements[1].classList.contains("selected")).toBe(true);
        expect(elements[1].getAttribute("aria-current")).toBe("true");
    });
});
