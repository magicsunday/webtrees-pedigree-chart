/**
 * This file is part of the package magicsunday/webtrees-pedigree-chart.
 *
 * For the full copyright and license information, please read the
 * LICENSE file distributed with this source code.
 */

import { jest } from "@jest/globals";
import { readFileSync } from "node:fs";

const {
    default: DetailPanel,
    PANEL_BREAKPOINT,
    PANEL_MEDIA_QUERY,
} = await import("resources/js/modules/detail-panel.js");

/**
 * Builds the markup the page provides for the panel.
 *
 * @return {HTMLElement}
 */
function buildPanelElement() {
    document.body.innerHTML = `
        <div class="row">
            <aside id="panel" class="offcanvas" hidden>
                <h2 data-panel="title" tabindex="-1"></h2>
                <p data-panel="hint"></p>
                <dl data-panel="facts"></dl>
                <p data-panel="empty" hidden></p>
                <div data-panel="actions" hidden>
                    <button data-panel="individual"></button>
                    <button data-panel="center"></button>
                </div>
            </aside>
        </div>`;

    return /** @type {HTMLElement} */ (document.getElementById("panel"));
}

/**
 * A media query list that tests can switch.
 *
 * @param {boolean} matches The initial state
 */
function mediaQuery(matches) {
    /** @type {Array<() => void>} */
    const listeners = [];

    return {
        matches,
        addEventListener: (_type, listener) => listeners.push(listener),
        change(value) {
            this.matches = value;
            listeners.forEach((listener) => listener());
        },
    };
}

/**
 * Builds a panel with recorded callbacks and a fake Bootstrap.
 *
 * @param {{wide?: boolean, bootstrap?: boolean}} options The state of the window
 */
function build({ wide = false, bootstrap = true } = {}) {
    const element = buildPanelElement();
    const query = mediaQuery(wide);
    const calls = [];
    const instance = {
        show: jest.fn(() => {
            element.classList.add("show");
            calls.push("show");
        }),
        hide: jest.fn(() => {
            element.classList.remove("show");
            calls.push("hide");
        }),
    };
    const getOrCreateInstance = jest.fn(() => instance);
    const callbacks = {
        onIndividual: jest.fn(),
        onCenter: jest.fn(),
        onClose: jest.fn(),
        onLayoutChange: jest.fn(),
    };
    const matchMedia = jest.fn(() => query);
    const win = {
        matchMedia,
        bootstrap: bootstrap ? { Offcanvas: { getOrCreateInstance } } : undefined,
    };
    const panel = new DetailPanel(element, callbacks, win);

    return { panel, element, query, instance, getOrCreateInstance, callbacks, matchMedia };
}

const person = {
    name: "Anna Schmidt",
    url: "/individual/I1",
    updateUrl: "/chart/I1",
    generation: 2,
    facts: [
        {
            tag: "BIRT",
            label: "Birth",
            date: "12 MAR 1980",
            place: "Leipzig",
            placeFull: "Leipzig, Sachsen",
            value: "",
        },
        null,
        { tag: "OCCU", label: "Occupation", date: "", place: "", placeFull: "", value: "Teacher" },
    ],
};

describe("DetailPanel breakpoint", () => {
    test("asks the browser for the inclusive wide query of the exported constant", () => {
        const { matchMedia } = build();

        expect(PANEL_MEDIA_QUERY).toBe("(min-width: 2000px)");
        expect(matchMedia).toHaveBeenCalledWith(`(min-width: ${PANEL_BREAKPOINT}px)`);
    });

    test("uses the same value as the stylesheet", () => {
        const css = readFileSync("resources/css/pedigree-chart.css", "utf8");

        expect(css).toContain(`@media (min-width: ${PANEL_BREAKPOINT}px)`);
    });
});

describe("DetailPanel layout", () => {
    test("stays hidden until it is enabled and then marks the page row", () => {
        const { panel, element } = build();

        expect(element.hidden).toBe(true);

        panel.enable();

        expect(element.hidden).toBe(false);
        expect(element.parentElement.classList.contains("has-detail-panel")).toBe(true);
    });

    test("opens the offcanvas below the breakpoint with scrolling and without a backdrop", () => {
        const { panel, instance, getOrCreateInstance, element } = build({ wide: false });

        panel.select(person);

        expect(getOrCreateInstance).toHaveBeenCalledWith(element, {
            scroll: true,
            backdrop: false,
        });
        expect(instance.show).toHaveBeenCalledTimes(1);
    });

    test("does not open the offcanvas from the breakpoint on", () => {
        const { panel, instance } = build({ wide: true });

        panel.select(person);

        expect(instance.show).not.toHaveBeenCalled();
    });

    test("falls back to a visible block when Bootstrap is missing", () => {
        const { panel, element } = build({ bootstrap: false });

        panel.select(person);

        expect(element.classList.contains("show")).toBe(true);
    });

    test("works in a window without matchMedia as a narrow layout", () => {
        const element = buildPanelElement();
        const panel = new DetailPanel(
            element,
            { onIndividual() {}, onCenter() {}, onClose() {}, onLayoutChange() {} },
            { matchMedia: undefined, bootstrap: undefined },
        );

        expect(panel.isWide()).toBe(false);
    });

    test("hides a shown offcanvas when the layout turns wide and tells the chart", () => {
        const { panel, instance, query, callbacks, element } = build({ wide: false });

        panel.select(person);
        query.change(true);

        expect(instance.hide).toHaveBeenCalledTimes(1);
        expect(callbacks.onLayoutChange).toHaveBeenCalledTimes(1);

        // The hide that the layout caused must not send the focus back to the chart
        element.dispatchEvent(new Event("hidden.bs.offcanvas"));

        expect(callbacks.onClose).not.toHaveBeenCalled();
    });

    test("does not open by itself when the layout turns narrow again", () => {
        const { panel, instance, query, callbacks } = build({ wide: false });

        panel.select(person);
        query.change(true);
        instance.show.mockClear();
        query.change(false);

        expect(instance.show).not.toHaveBeenCalled();
        expect(callbacks.onLayoutChange).toHaveBeenCalledTimes(2);
    });

    test("does not hide anything when it turns wide without a shown offcanvas", () => {
        const { instance, query } = build({ wide: false });

        query.change(true);

        expect(instance.hide).not.toHaveBeenCalled();
    });
});

describe("DetailPanel focus", () => {
    test("hands the focus back when the user closes the offcanvas", () => {
        const { element, callbacks } = build();

        element.dispatchEvent(new Event("hidden.bs.offcanvas"));

        expect(callbacks.onClose).toHaveBeenCalledTimes(1);
    });

    test("hands the focus back on Escape in the wide column only", () => {
        const wide = build({ wide: true });
        wide.element.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));

        expect(wide.callbacks.onClose).toHaveBeenCalledTimes(1);

        const narrow = build({ wide: false });
        narrow.element.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));

        expect(narrow.callbacks.onClose).not.toHaveBeenCalled();
    });

    test("moves the focus to the heading after a keyboard selection in the wide column", () => {
        const { panel, element } = build({ wide: true });

        panel.select(person, true);

        expect(document.activeElement).toBe(element.querySelector("[data-panel='title']"));
    });

    test("moves the focus to the heading once the offcanvas is shown", () => {
        const { panel, element } = build({ wide: false });
        const title = element.querySelector("[data-panel='title']");

        panel.select(person, true);

        expect(document.activeElement).not.toBe(title);

        element.dispatchEvent(new Event("shown.bs.offcanvas"));

        expect(document.activeElement).toBe(title);
    });

    test("leaves the focus alone after a selection with the mouse", () => {
        const { panel, element } = build({ wide: true });

        panel.select(person, false);

        expect(document.activeElement).not.toBe(element.querySelector("[data-panel='title']"));
    });
});

describe("DetailPanel content", () => {
    test("writes the name and one row per present fact", () => {
        const { panel, element } = build({ wide: true });

        panel.select(person);

        expect(element.querySelector("[data-panel='title']").textContent).toBe("Anna Schmidt");

        const terms = [...element.querySelectorAll("dt")].map((term) => term.textContent);

        expect(terms).toEqual(["Birth", "Occupation"]);
        expect(element.querySelector(".detail-date").textContent).toBe("12 MAR 1980");
        expect(element.querySelector(".detail-place").textContent).toBe("Leipzig");
        expect(element.querySelector(".detail-place-full").textContent).toBe("Leipzig, Sachsen");
        expect(element.querySelector(".detail-value").textContent).toBe("Teacher");
    });

    test("leaves the full place out when it equals the short one", () => {
        const { panel, element } = build({ wide: true });

        panel.select({
            ...person,
            facts: [{ label: "Birth", date: "", place: "Berlin", placeFull: "Berlin", value: "" }],
        });

        expect(element.querySelector(".detail-place-full")).toBeNull();
    });

    test("replaces the content of the previous person", () => {
        const { panel, element } = build({ wide: true });

        panel.select(person);
        panel.select({ ...person, name: "Karl Schmidt", facts: [] });

        expect(element.querySelector("[data-panel='title']").textContent).toBe("Karl Schmidt");
        expect(element.querySelectorAll("dt")).toHaveLength(0);
    });

    test("shows a note instead of facts when the payload has none", () => {
        const { panel, element } = build({ wide: true });

        panel.select({ name: "Anna", url: "/i", updateUrl: "/u", generation: 2 });

        expect(element.querySelector("[data-panel='empty']").hidden).toBe(false);
        expect(element.querySelector("[data-panel='hint']").hidden).toBe(true);
    });

    test("survives malformed fact entries", () => {
        const { panel, element } = build({ wide: true });

        panel.select({
            ...person,
            facts: [5, "text", [], undefined, { label: null, date: undefined, value: 7 }],
        });

        expect(element.querySelectorAll("dt")).toHaveLength(1);
    });

    test("writes hostile values as text and builds no element from them", () => {
        const { panel, element } = build({ wide: true });
        const hostile = '<img src=x onerror="alert(1)"><script>alert(2)</script>';
        const toStringObject = { toString: () => "<b>bold</b>" };

        panel.select({
            ...person,
            name: hostile,
            facts: [
                {
                    label: hostile,
                    date: hostile,
                    place: hostile,
                    placeFull: toStringObject,
                    value: hostile,
                },
                { label: "__proto__", date: "", place: "", placeFull: "", value: "constructor" },
            ],
        });

        expect(element.querySelector("img")).toBeNull();
        expect(element.querySelector("script")).toBeNull();
        expect(element.querySelector("b")).toBeNull();
        expect(element.querySelector("[data-panel='title']").textContent).toBe(hostile);
        expect(element.querySelector(".detail-value").textContent).toBe(hostile);
    });

    test("never writes person text through an HTML sink", () => {
        const source = readFileSync("resources/js/modules/detail-panel.js", "utf8");

        expect(source).not.toMatch(/innerHTML|insertAdjacentHTML|\.html\(/);
    });
});

describe("DetailPanel actions", () => {
    test("offers both buttons for a person below the root and hands them the URLs", () => {
        const { panel, element, callbacks } = build({ wide: true });

        panel.select(person);

        element.querySelector("[data-panel='individual']").click();
        element.querySelector("[data-panel='center']").click();

        expect(callbacks.onIndividual).toHaveBeenCalledWith("/individual/I1");
        expect(callbacks.onCenter).toHaveBeenCalledWith("/chart/I1");
        expect(element.querySelector("[data-panel='actions']").hidden).toBe(false);
    });

    test("offers no centring for the root person", () => {
        const { panel, element } = build({ wide: true });

        panel.select({ ...person, generation: 1 });

        expect(element.querySelector("[data-panel='center']").hidden).toBe(true);
        expect(element.querySelector("[data-panel='individual']").hidden).toBe(false);
    });

    test("does nothing for a button without a URL", () => {
        const { panel, element, callbacks } = build({ wide: true });

        panel.select({ ...person, url: "", updateUrl: "" });
        element.querySelector("[data-panel='individual']").click();
        element.querySelector("[data-panel='center']").click();

        expect(callbacks.onIndividual).not.toHaveBeenCalled();
        expect(callbacks.onCenter).not.toHaveBeenCalled();
    });
});
