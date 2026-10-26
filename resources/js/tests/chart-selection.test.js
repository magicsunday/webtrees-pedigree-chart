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
    const classed = jest.fn(() => selection);
    const attr = jest.fn(() => selection);
    const selection = { classed, attr };
    const context = {
        _configuration: { showDetailPanel, openNewTabOnClick: false },
        _detailPanel: panel,
        _selectedXref: null,
        _svg: { visual: { selectAll: jest.fn(() => selection) } },
        applySelection: jest.fn(),
        redirectToIndividual: jest.fn(),
        update: jest.fn(),
    };

    return { context, selection };
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

        expect(context._selectedXref).toBe("I2");
        expect(context.applySelection).toHaveBeenCalledTimes(1);
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
        expect(context._selectedXref).toBeNull();
    });

    test("behaves as before when the page has no panel element", () => {
        const { context } = buildChart({ panel: null });

        Chart.prototype.personClick.call(context, person());

        expect(context.update).toHaveBeenCalledWith("/chart/I2");
    });
});

describe("Chart keyboard access", () => {
    /**
     * Builds the stand-in of a d3 selection that records the keydown handler.
     */
    function buildElement() {
        const attributes = {};
        const handlers = {};
        const element = {
            attr: (name, value) => {
                attributes[name] = value;

                return element;
            },
            on: (name, handler) => {
                handlers[name] = handler;

                return element;
            },
        };

        return { element, attributes, handlers };
    }

    test("makes a person a focusable button with its name", () => {
        const { element, attributes } = buildElement();

        Chart.prototype.makeKeyboardOperable.call({}, element, { data: person({ name: "Anna" }) });

        expect(attributes).toEqual({ tabindex: 0, role: "button", "aria-label": "Anna" });
    });

    test.each([["Enter"], [" "]])(
        "activates the person with %j and stops the default action",
        (key) => {
            const { element, handlers } = buildElement();
            const context = { personClick: jest.fn() };
            const data = person({ name: "Anna" });
            const preventDefault = jest.fn();

            Chart.prototype.makeKeyboardOperable.call(context, element, { data });
            handlers.keydown({ key, preventDefault });

            expect(preventDefault).toHaveBeenCalledTimes(1);
            expect(context.personClick).toHaveBeenCalledWith(data, true);
        },
    );

    test("ignores every other key", () => {
        const { element, handlers } = buildElement();
        const context = { personClick: jest.fn() };
        const preventDefault = jest.fn();

        Chart.prototype.makeKeyboardOperable.call(context, element, { data: person() });
        handlers.keydown({ key: "a", preventDefault });
        handlers.keydown({ key: "Tab", preventDefault });

        expect(preventDefault).not.toHaveBeenCalled();
        expect(context.personClick).not.toHaveBeenCalled();
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
            makeKeyboardOperable: jest.fn((target, node) => bound.push([target, node])),
            applySelection: jest.fn(),
            personClick: jest.fn(),
        };

        return { context, bound, element };
    }

    const node = (xref, url) => ({ data: { data: { xref, url } } });

    test("makes the selectable persons keyboard operable with the panel on", () => {
        const first = node("I1", "/i/1");
        const { context, bound } = bind(true, [first, node("", "")]);

        Chart.prototype.bindClickEventListener.call(context);

        expect(context.makeKeyboardOperable).toHaveBeenCalledTimes(1);
        expect(bound[0][1]).toBe(first);
    });

    test("leaves the persons as they were with the panel off", () => {
        const { context } = bind(false, [node("I1", "/i/1")]);

        Chart.prototype.bindClickEventListener.call(context);

        expect(context.makeKeyboardOperable).not.toHaveBeenCalled();
    });

    test("applies the selection again after the persons are bound", () => {
        const { context } = bind(true, [node("I1", "/i/1")]);

        Chart.prototype.bindClickEventListener.call(context);

        expect(context.applySelection).toHaveBeenCalledTimes(1);
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
            makeKeyboardOperable: jest.fn(),
            applySelection: jest.fn(),
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

describe("Chart selection marks", () => {
    test("marks the selected person and nobody else", () => {
        const { context, selection } = buildChart();
        context._selectedXref = "I2";

        Chart.prototype.applySelection.call(context);

        const isSelected = selection.classed.mock.calls[0][1];
        const ariaCurrent = selection.attr.mock.calls[0][1];

        // The d3 datum is the hierarchy node, its data is the datum of the chart
        const node = (data) => ({ data });

        expect(selection.classed.mock.calls[0][0]).toBe("selected");
        expect(isSelected(node(person()))).toBe(true);
        expect(isSelected(node(person({ xref: "I3" })))).toBe(false);
        expect(ariaCurrent(node(person()))).toBe("true");
        expect(ariaCurrent(node(person({ xref: "I3" })))).toBeNull();
    });

    test("marks nobody while nothing is selected", () => {
        const { context, selection } = buildChart();

        Chart.prototype.applySelection.call(context);

        expect(selection.classed.mock.calls[0][1]({ data: person({ xref: "" }) })).toBe(false);
    });

    test("clears the selection and the marks when the panel has closed", () => {
        const { context } = buildChart();
        context._selectedXref = "I2";
        context._selectedDatum = {};

        Chart.prototype.clearSelection.call(context);

        expect(context._selectedXref).toBeNull();
        expect(context._selectedDatum).toBeNull();
        expect(context.applySelection).toHaveBeenCalledTimes(1);
    });

    test("gives the focus back to the selected person if it is still there", () => {
        const focus = jest.fn();
        const element = document.createElementNS("http://www.w3.org/2000/svg", "g");
        element.focus = focus;
        const context = {
            _selectedDatum: {},
            _svg: { visual: { selectAll: () => ({ filter: () => ({ node: () => element }) }) } },
        };

        Chart.prototype.restoreFocus.call(context);

        expect(focus).toHaveBeenCalledWith({ preventScroll: true });
    });

    test("gives the focus back to the occurrence the user activated, not to the first one", () => {
        const first = document.createElementNS("http://www.w3.org/2000/svg", "g");
        const second = document.createElementNS("http://www.w3.org/2000/svg", "g");
        first.focus = jest.fn();
        second.focus = jest.fn();

        // The same ancestor appears twice in the chart, so both groups carry the same xref
        const datumOfFirst = { data: { xref: "I5" } };
        const datumOfSecond = { data: { xref: "I5" } };
        const nodes = [
            [first, { data: datumOfFirst }],
            [second, { data: datumOfSecond }],
        ];
        const selection = {
            filter(predicate) {
                return { node: () => nodes.find(([, node]) => predicate(node))?.[0] ?? null };
            },
        };
        const context = {
            _selectedDatum: datumOfSecond,
            _svg: { visual: { selectAll: () => selection } },
        };

        Chart.prototype.restoreFocus.call(context);

        expect(second.focus).toHaveBeenCalledWith({ preventScroll: true });
        expect(first.focus).not.toHaveBeenCalled();
    });

    test("does nothing when the selected person is gone after a redraw", () => {
        const context = {
            _selectedDatum: {},
            _svg: { visual: { selectAll: () => ({ filter: () => ({ node: () => null }) }) } },
        };

        expect(() => Chart.prototype.restoreFocus.call(context)).not.toThrow();
    });
});
