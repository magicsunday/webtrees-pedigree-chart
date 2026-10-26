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
                <img data-panel="image" alt="" hidden>
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
        onHidden: jest.fn(),
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
        expect(instance.show).toHaveBeenCalledTimes(2);
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

    test("tells the chart that the panel is hidden, after the focus went back", () => {
        const { element, callbacks } = build();
        const calls = [];
        callbacks.onClose.mockImplementation(() => calls.push("close"));
        callbacks.onHidden.mockImplementation(() => calls.push("hidden"));

        element.dispatchEvent(new Event("hidden.bs.offcanvas"));

        expect(calls).toEqual(["close", "hidden"]);
    });
});

describe("DetailPanel outside click", () => {
    /**
     * Opens the panel and lets Bootstrap report that it is shown.
     */
    function openPanel() {
        const built = build();

        built.panel.select(person);
        built.element.dispatchEvent(new Event("shown.bs.offcanvas"));

        return built;
    }

    test("closes on a click beside the panel and keeps the focus where the user put it", () => {
        const { instance, element, callbacks } = openPanel();

        document.body.click();

        expect(instance.hide).toHaveBeenCalledTimes(1);

        element.dispatchEvent(new Event("hidden.bs.offcanvas"));

        expect(callbacks.onClose).not.toHaveBeenCalled();
        expect(callbacks.onHidden).toHaveBeenCalledTimes(1);
    });

    test("hands the focus back after a close by other means", () => {
        const { instance, element, callbacks } = openPanel();

        document.body.click();
        element.dispatchEvent(new Event("hidden.bs.offcanvas"));
        element.dispatchEvent(new Event("hidden.bs.offcanvas"));

        expect(instance.hide).toHaveBeenCalledTimes(1);
        expect(callbacks.onClose).toHaveBeenCalledTimes(1);
    });

    test("stays open on a click inside the panel", () => {
        const { instance, element } = openPanel();

        element.querySelector("[data-panel='title']").click();

        expect(instance.hide).not.toHaveBeenCalled();
    });

    test("stays open on a click on a person, which only swaps the content", () => {
        const { instance } = openPanel();
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
        const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");

        group.setAttribute("class", "person");
        group.appendChild(rect);
        svg.appendChild(group);
        document.body.appendChild(svg);

        rect.dispatchEvent(new MouseEvent("click", { bubbles: true }));

        expect(instance.hide).not.toHaveBeenCalled();
    });

    test("does not react before the panel is shown, so the opening click cannot close it", () => {
        const { instance, panel } = build();

        panel.select(person);
        document.body.click();

        expect(instance.hide).not.toHaveBeenCalled();
    });

    test("stops listening once the panel is hidden", () => {
        const { instance, element } = openPanel();

        element.dispatchEvent(new Event("hidden.bs.offcanvas"));
        document.body.click();

        expect(instance.hide).not.toHaveBeenCalled();
    });
});

describe("DetailPanel escape and semantics", () => {
    function openPanel() {
        const built = build();

        built.panel.select(person);
        built.element.dispatchEvent(new Event("shown.bs.offcanvas"));

        return built;
    }

    test("closes on Escape while the focus is on the chart and keeps the focus there", () => {
        const { instance, element, callbacks } = openPanel();

        document.body.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));

        expect(instance.hide).toHaveBeenCalledTimes(1);

        element.dispatchEvent(new Event("hidden.bs.offcanvas"));

        expect(callbacks.onClose).not.toHaveBeenCalled();
    });

    test("leaves Escape inside the panel to Bootstrap, which hands the focus back", () => {
        const { instance, element } = openPanel();

        element
            .querySelector("[data-panel='title']")
            .dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));

        expect(instance.hide).not.toHaveBeenCalled();
    });

    test("ignores every other key and stops listening once hidden", () => {
        const { instance, element } = openPanel();

        document.body.dispatchEvent(new KeyboardEvent("keydown", { key: "a", bubbles: true }));

        expect(instance.hide).not.toHaveBeenCalled();

        element.dispatchEvent(new Event("hidden.bs.offcanvas"));
        document.body.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));

        expect(instance.hide).not.toHaveBeenCalled();
    });

    test("is no modal dialog, as the chart stays usable beside it", () => {
        const built = build();

        // Bootstrap sets these when it shows the offcanvas
        built.element.setAttribute("role", "dialog");
        built.element.setAttribute("aria-modal", "true");
        built.panel.select(person);
        built.element.dispatchEvent(new Event("shown.bs.offcanvas"));

        expect(built.element.hasAttribute("aria-modal")).toBe(false);
        expect(built.element.getAttribute("role")).toBe("complementary");
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
        expect(element.querySelector(".detail-place").textContent).toBe("Leipzig, Sachsen");
        expect(element.querySelector(".detail-place").title).toBe("");
        expect(element.querySelector(".detail-value").textContent).toBe("Teacher");
    });

    test("shows the value first, then the date and the place", () => {
        const { panel, element } = build();

        panel.select({
            ...person,
            facts: [
                {
                    label: "Occupation",
                    date: "01.10.2008",
                    place: "",
                    placeFull: "Wurzen, Sachsen",
                    value: "Clerk",
                },
            ],
        });

        const classes = [...element.querySelector("dd").children].map((line) => line.className);

        expect(classes).toEqual(["detail-value", "detail-date", "detail-place"]);
    });

    test("shows the other spouse of a family event first, and writes it as text", () => {
        const { panel, element } = build();
        const hostile = '<img src=x onerror="window.pwned=1">';

        panel.select({
            ...person,
            facts: [
                {
                    label: "Marriage",
                    date: "05 MAY 1950",
                    place: "",
                    placeFull: "Wurzen, Sachsen",
                    value: "",
                    partner: hostile,
                },
            ],
        });

        const lines = [...element.querySelector("dd").children];

        expect(lines.map((line) => line.className)).toEqual([
            "detail-partner",
            "detail-date",
            "detail-place",
        ]);
        expect(lines[0].textContent).toBe(hostile);
        expect(element.querySelector("[data-panel='facts'] img")).toBeNull();
    });

    describe("order of the facts", () => {
        const fact = (label, sortDay) => ({
            label,
            date: "",
            place: "",
            placeFull: "",
            value: label,
            partner: "",
            ...(sortDay === undefined ? {} : { sortDay }),
        });

        const labelsOf = (element) =>
            [...element.querySelectorAll("dt")].map((term) => term.textContent);

        test("keeps the birth first and the death last and sorts the rest by time", () => {
            const { panel, element } = build();

            panel.select({
                ...person,
                // The birth is dated after one fact and the death before another, so a sort that
                // treats every slot alike would move them.
                facts: [
                    fact("Birth", 2406000),
                    fact("Death", 2401000),
                    fact("Marriage", 2415000),
                    fact("Occupation", 2405000),
                    fact("Residence", 2410000),
                ],
            });

            expect(labelsOf(element)).toEqual([
                "Birth",
                "Occupation",
                "Residence",
                "Marriage",
                "Death",
            ]);
        });

        test("keeps a fact without a usable date at its place among the others", () => {
            const { panel, element } = build();

            panel.select({
                ...person,
                facts: [
                    fact("Birth", 2400000),
                    null,
                    fact("Late", 2420000),
                    fact("Note", 0),
                    fact("Early", 2410000),
                ],
            });

            expect(labelsOf(element)).toEqual(["Birth", "Early", "Note", "Late"]);
        });

        test("keeps the order of the payload when it carries no sort day", () => {
            const { panel, element } = build();

            panel.select({
                ...person,
                facts: [fact("Birth"), fact("Death"), fact("Second"), fact("First")],
            });

            expect(labelsOf(element)).toEqual(["Birth", "Second", "First", "Death"]);
        });

        test("does not sort the facts of the same day away from their payload order", () => {
            const { panel, element } = build();

            panel.select({
                ...person,
                facts: [null, null, fact("A", 2410000), fact("B", 2410000)],
            });

            expect(labelsOf(element)).toEqual(["A", "B"]);
        });
    });

    test("shows the other spouse before the value, the date and the place", () => {
        const { panel, element } = build();

        panel.select({
            ...person,
            facts: [
                {
                    label: "Marriage",
                    date: "05 MAY 1950",
                    place: "",
                    placeFull: "Wurzen, Sachsen",
                    value: "Civil",
                    partner: "Anna Schmidt",
                },
            ],
        });

        const classes = [...element.querySelector("dd").children].map((line) => line.className);

        expect(classes).toEqual(["detail-partner", "detail-value", "detail-date", "detail-place"]);
    });

    test("leaves the partner line out when the payload has none", () => {
        const { panel, element } = build();

        panel.select(person);

        expect(element.querySelector(".detail-partner")).toBeNull();
    });

    test("shows the short place when the payload has no full name", () => {
        const { panel, element } = build();

        panel.select({
            ...person,
            facts: [{ label: "Birth", date: "", place: "Rom", placeFull: "", value: "" }],
        });

        expect(element.querySelector(".detail-place").textContent).toBe("Rom");
    });

    test("does not show the GEDCOM value Y, which only says that the event took place", () => {
        const { panel, element } = build();

        panel.select({
            ...person,
            facts: [
                { label: "Birth", date: "", place: "", placeFull: "", value: "Y" },
                { label: "Occupation", date: "", place: "", placeFull: "", value: "Y2" },
            ],
        });

        expect(element.querySelector(".detail-value").textContent).toBe("Y2");
    });

    test("leaves out a fact that has nothing to show and notes an empty panel", () => {
        const { panel, element } = build();

        panel.select({
            ...person,
            facts: [{ label: "Birth", date: "", place: "", placeFull: "", value: "Y" }],
        });

        expect(element.querySelectorAll("dt")).toHaveLength(0);
        expect(element.querySelector("[data-panel='empty']").hidden).toBe(false);
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
                    place: "",
                    placeFull: hostile,
                    value: hostile,
                },
                {
                    label: "__proto__",
                    date: "",
                    place: "",
                    placeFull: toStringObject,
                    value: "constructor",
                },
            ],
        });

        expect(element.querySelector("[data-panel='facts'] img")).toBeNull();
        expect(element.querySelector("script")).toBeNull();
        expect(element.querySelector("b")).toBeNull();
        expect(element.querySelector("[data-panel='title']").textContent).toBe(hostile);
        expect(element.querySelector(".detail-value").textContent).toBe(hostile);

        const places = [...element.querySelectorAll(".detail-place")];

        expect(places.map((place) => place.textContent)).toEqual([hostile, "<b>bold</b>"]);
    });

    test("never writes person text through an HTML sink", () => {
        const source = readFileSync("resources/js/modules/detail-panel.js", "utf8");

        expect(source).not.toMatch(/innerHTML|insertAdjacentHTML|\.html\(/);
    });
});

describe("DetailPanel image", () => {
    const imageOf = (element) => element.querySelector("[data-panel='image']");

    test("shows the thumbnail of the person", () => {
        const { panel, element } = build();

        panel.select({ ...person, thumbnail: "/thumb/anna.jpg", silhouette: "/sil/f.svg" });

        expect(imageOf(element).getAttribute("src")).toBe("/thumb/anna.jpg");
        expect(imageOf(element).hidden).toBe(false);
    });

    test("falls back to the silhouette when the thumbnail cannot be loaded", () => {
        const { panel, element } = build();

        panel.select({ ...person, thumbnail: "/thumb/gone.jpg", silhouette: "/sil/f.svg" });
        imageOf(element).dispatchEvent(new Event("error"));

        expect(imageOf(element).getAttribute("src")).toBe("/sil/f.svg");
        expect(imageOf(element).hidden).toBe(false);
    });

    test("hides the image when the silhouette fails as well, without looping", () => {
        const { panel, element } = build();

        panel.select({ ...person, thumbnail: "/thumb/gone.jpg", silhouette: "/sil/f.svg" });
        imageOf(element).dispatchEvent(new Event("error"));
        imageOf(element).dispatchEvent(new Event("error"));

        expect(imageOf(element).hidden).toBe(true);
    });

    test("hides the image when the person has no thumbnail, as the box shows no silhouette then", () => {
        const { panel, element } = build();

        panel.select({ ...person, thumbnail: "", silhouette: "/sil/f.svg" });

        expect(imageOf(element).hidden).toBe(true);
        expect(imageOf(element).hasAttribute("src")).toBe(false);
    });

    test("hides the image for a payload without image fields", () => {
        const { panel, element } = build();

        panel.select(person);

        expect(imageOf(element).hidden).toBe(true);
    });

    test("selecting a person without a thumbnail clears the image of the previous person", () => {
        const { panel, element } = build();

        panel.select({ ...person, thumbnail: "/thumb/anna.jpg", silhouette: "/sil/f.svg" });
        panel.select({ ...person, name: "Karl Schmidt" });

        expect(imageOf(element).hidden).toBe(true);
        expect(imageOf(element).hasAttribute("src")).toBe(false);
    });

    test("falls back to the silhouette of the person that is shown", () => {
        const { panel, element } = build();

        panel.select({ ...person, thumbnail: "/thumb/a.jpg", silhouette: "/sil/a.svg" });
        panel.select({ ...person, thumbnail: "/thumb/b.jpg", silhouette: "/sil/b.svg" });
        imageOf(element).dispatchEvent(new Event("error"));

        expect(imageOf(element).getAttribute("src")).toBe("/sil/b.svg");
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
