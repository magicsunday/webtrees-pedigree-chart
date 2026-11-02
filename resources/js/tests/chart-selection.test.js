/**
 * This file is part of the package magicsunday/webtrees-pedigree-chart.
 *
 * For the full copyright and license information, please read the
 * LICENSE file distributed with this source code.
 */

import { jest } from "@jest/globals";

// The click binding never reads the panel switch, because a person is operable in both modes. One
// case per mode keeps the sentence of AGENTS.md pinned: a guard around the binding fails for off.
const panelModes = [
    { panel: "on", showDetailPanel: true },
    { panel: "off", showDetailPanel: false },
];

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

        return { context, bound };
    }

    const node = (xref, url) => ({ data: { data: { xref, url } } });

    test.each(panelModes)(
        "makes the selectable persons keyboard operable with the panel $panel",
        ({ showDetailPanel }) => {
            const first = node("I1", "/i/1");
            const { context, bound } = bind(showDetailPanel, [first, node("", "")]);

            Chart.prototype.bindClickEventListener.call(context);

            expect(context._selection.makeOperable).toHaveBeenCalledTimes(1);
            expect(bound[0][1]).toBe(first);
        },
    );

    test.each(panelModes)(
        "hands the key activation of a person to the click routing with the panel $panel",
        ({ showDetailPanel }) => {
            const first = node("I1", "/i/1");
            const { context, bound } = bind(showDetailPanel, [first]);

            Chart.prototype.bindClickEventListener.call(context);
            bound[0][2](first.data, true);

            expect(context.personClick).toHaveBeenCalledWith(first.data, true);
        },
    );

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

    // The click binding is the same with the panel on and off, so a guard around it fails for one mode
    test.each(panelModes)(
        "hands the data of a clicked person to the click routing with the panel $panel",
        ({ showDetailPanel }) => {
            const first = node("I1", "/i/1");
            const { context, elements } = bindReal([first], showDetailPanel);

            elements[0].dispatchEvent(new MouseEvent("click"));

            expect(context.personClick).toHaveBeenCalledTimes(1);
            expect(context.personClick).toHaveBeenCalledWith(first.data);
        },
    );

    test("binds no click to a box that has neither an xref nor a url", () => {
        const { context, elements } = bindReal([node("", "")]);

        elements[0].dispatchEvent(new MouseEvent("click"));

        expect(context.personClick).not.toHaveBeenCalled();
    });
});

describe("A person box with the real selection", () => {
    // The chart draws the text of a box before it binds the persons. The accessible name of an
    // operable person is the text the box shows, with the panel on and off alike.

    /**
     * Builds a person element like the chart draws it: one text per line of the box, each with
     * a tspan per part and a title of its own.
     *
     * @param {(string|string[])[]} lines The visible lines of the box, a line with several tspans is an array
     *
     * @return {SVGGElement} The person group element
     */
    function drawPerson(lines) {
        const ns = "http://www.w3.org/2000/svg";
        const element = document.createElementNS(ns, "g");

        element.setAttribute("class", "person");

        lines.forEach((line) => {
            const text = document.createElementNS(ns, "text");
            const title = document.createElementNS(ns, "title");

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

    /**
     * Binds a real chart with its real selection to one person group.
     *
     * @param {Element} element        The person group
     * @param {boolean} showDetailPanel Whether the panel is on
     */
    function bindPerson(element, showDetailPanel) {
        document.body.innerHTML = '<div id="parent"></div><svg><g class="visual"></g></svg>';

        const visual = d3.select(document.querySelector("g.visual"));

        visual.node().append(element);
        d3.select(element).datum({ data: { data: { xref: "I1", url: "/i/1", name: "Jane Doe" } } });

        const chart = new Chart(d3.select("#parent"), {
            showDetailPanel,
            openNewTabOnClick: false,
        });

        chart._svg = { visual };
        chart.bindClickEventListener();

        return chart;
    }

    test.each(panelModes)(
        "names an operable person with the text that the box shows with the panel $panel",
        ({ showDetailPanel }) => {
            // The bare name is Jane Doe, while the box shows the dates as well, so the name would
            // not contain the visible text (WCAG 2.5.3). A line with several tspans is joined by a space.
            const element = drawPerson([["Jane", "Doe"], "Born: 1850"]);

            bindPerson(element, showDetailPanel);

            expect(element.getAttribute("role")).toBe("button");
            expect(element.getAttribute("tabindex")).toBe("0");
            expect(element.getAttribute("aria-label")).toBe("Jane Doe Born: 1850");
        },
    );

    test.each(panelModes)(
        "names a person whose box shows no text with the bare name with the panel $panel",
        ({ showDetailPanel }) => {
            const element = drawPerson([]);

            bindPerson(element, showDetailPanel);

            expect(element.getAttribute("aria-label")).toBe("Jane Doe");
        },
    );

    test.each(panelModes)(
        "hands the key activation of a real person to the click routing with the panel $panel",
        ({ showDetailPanel }) => {
            const element = drawPerson(["Jane"]);
            const chart = bindPerson(element, showDetailPanel);

            chart.personClick = jest.fn();
            element.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));

            expect(chart.personClick).toHaveBeenCalledTimes(1);
            expect(chart.personClick.mock.calls[0][1]).toBe(true);
        },
    );
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
