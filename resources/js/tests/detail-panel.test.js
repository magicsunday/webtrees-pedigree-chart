/**
 * This file is part of the package magicsunday/webtrees-pedigree-chart.
 *
 * For the full copyright and license information, please read the
 * LICENSE file distributed with this source code.
 */

import { jest } from "@jest/globals";
import { readFileSync } from "node:fs";

const { default: DetailPanel } = await import("resources/js/modules/detail-panel.js");

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
 * Builds a panel with recorded callbacks and a fake Bootstrap.
 *
 * @param {{bootstrap?: boolean}} options The state of the window
 */
function build({ bootstrap = true } = {}) {
    const element = buildPanelElement();
    const instance = {
        show: jest.fn(() => element.classList.add("show")),
        hide: jest.fn(() => element.classList.remove("show")),
    };
    const getOrCreateInstance = jest.fn(() => instance);
    const callbacks = {
        onIndividual: jest.fn(),
        onCenter: jest.fn(),
        onClose: jest.fn(),
    };
    const win = { bootstrap: bootstrap ? { Offcanvas: { getOrCreateInstance } } : undefined };
    const panel = new DetailPanel(element, callbacks, win);

    return { panel, element, instance, getOrCreateInstance, callbacks };
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

describe("DetailPanel offcanvas", () => {
    test("stays hidden until it is enabled", () => {
        const { panel, element } = build();

        expect(element.hidden).toBe(true);

        panel.enable();

        expect(element.hidden).toBe(false);
    });

    test("opens with scrolling on and without a backdrop, so the chart stays usable", () => {
        const { panel, instance, getOrCreateInstance, element } = build();

        panel.select(person);

        expect(getOrCreateInstance).toHaveBeenCalledWith(element, {
            scroll: true,
            backdrop: false,
        });
        expect(instance.show).toHaveBeenCalledTimes(1);
    });

    test("selecting another person replaces the content and shows the offcanvas again", () => {
        const { panel, instance, element } = build();

        panel.select(person);
        panel.select({ ...person, name: "Karl Schmidt" });

        expect(element.querySelector("[data-panel='title']").textContent).toBe("Karl Schmidt");
        expect(instance.hide).not.toHaveBeenCalled();
    });

    test("falls back to a visible block when Bootstrap is missing", () => {
        const { panel, element } = build({ bootstrap: false });

        panel.select(person);

        expect(element.classList.contains("show")).toBe(true);
    });

    test("hands the focus back to the chart when the offcanvas is hidden", () => {
        const { element, callbacks } = build();

        element.dispatchEvent(new Event("hidden.bs.offcanvas"));

        expect(callbacks.onClose).toHaveBeenCalledTimes(1);
    });
});

describe("DetailPanel focus", () => {
    test("moves the focus to the heading once the offcanvas is shown after a keyboard selection", () => {
        const { panel, element } = build();
        const title = element.querySelector("[data-panel='title']");

        panel.select(person, true);

        expect(document.activeElement).not.toBe(title);

        element.dispatchEvent(new Event("shown.bs.offcanvas"));

        expect(document.activeElement).toBe(title);
    });

    test("moves the focus at once when the offcanvas is already shown", () => {
        const { panel, element } = build();
        const title = element.querySelector("[data-panel='title']");

        panel.select(person);
        panel.select(person, true);

        expect(document.activeElement).toBe(title);
    });

    test("leaves the focus alone after a selection with the mouse", () => {
        const { panel, element } = build();

        panel.select(person, false);
        element.dispatchEvent(new Event("shown.bs.offcanvas"));

        expect(document.activeElement).not.toBe(element.querySelector("[data-panel='title']"));
    });
});

describe("DetailPanel content", () => {
    test("writes the name and one row per present fact", () => {
        const { panel, element } = build();

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
        const { panel, element } = build();

        panel.select({
            ...person,
            facts: [{ label: "Birth", date: "", place: "Berlin", placeFull: "Berlin", value: "" }],
        });

        expect(element.querySelector(".detail-place-full")).toBeNull();
    });

    test("replaces the content of the previous person", () => {
        const { panel, element } = build();

        panel.select(person);
        panel.select({ ...person, name: "Karl Schmidt", facts: [] });

        expect(element.querySelector("[data-panel='title']").textContent).toBe("Karl Schmidt");
        expect(element.querySelectorAll("dt")).toHaveLength(0);
    });

    test("shows a note instead of facts when the payload has none", () => {
        const { panel, element } = build();

        panel.select({ name: "Anna", url: "/i", updateUrl: "/u", generation: 2 });

        expect(element.querySelector("[data-panel='empty']").hidden).toBe(false);
        expect(element.querySelector("[data-panel='hint']").hidden).toBe(true);
    });

    test("survives malformed fact entries", () => {
        const { panel, element } = build();

        panel.select({
            ...person,
            facts: [5, "text", [], undefined, { label: null, date: undefined, value: 7 }],
        });

        expect(element.querySelectorAll("dt")).toHaveLength(1);
    });

    test("writes hostile values as text and builds no element from them", () => {
        const { panel, element } = build();
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
        const { panel, element, callbacks } = build();

        panel.select(person);

        element.querySelector("[data-panel='individual']").click();
        element.querySelector("[data-panel='center']").click();

        expect(callbacks.onIndividual).toHaveBeenCalledWith("/individual/I1");
        expect(callbacks.onCenter).toHaveBeenCalledWith("/chart/I1");
        expect(element.querySelector("[data-panel='actions']").hidden).toBe(false);
    });

    test("offers no centring for the root person", () => {
        const { panel, element } = build();

        panel.select({ ...person, generation: 1 });

        expect(element.querySelector("[data-panel='center']").hidden).toBe(true);
        expect(element.querySelector("[data-panel='individual']").hidden).toBe(false);
    });

    test("does nothing for a button without a URL", () => {
        const { panel, element, callbacks } = build();

        panel.select({ ...person, url: "", updateUrl: "" });
        element.querySelector("[data-panel='individual']").click();
        element.querySelector("[data-panel='center']").click();

        expect(callbacks.onIndividual).not.toHaveBeenCalled();
        expect(callbacks.onCenter).not.toHaveBeenCalled();
    });
});
