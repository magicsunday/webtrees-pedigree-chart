import { describe, it, expect, beforeEach } from "@jest/globals";
import { initHelpPopover, syncHelpMode } from "../modules/help-popover.js";

function setupDom({ panel = false } = {}) {
    document.body.innerHTML = `
        <input type="hidden" name="showDetailPanel" value="0">
        <input type="checkbox" name="showDetailPanel" value="1"${panel ? " checked" : ""}>
        <div class="position-relative d-inline-block">
            <button class="btn-help" aria-expanded="false" aria-controls="pedigree-chart-help-popover">
                Help
            </button>
            <div id="pedigree-chart-help-popover" class="help-popover d-none" role="region">
                <table>
                    <tr data-help-mode="default"><td>Click on a person</td></tr>
                    <tr data-help-mode="panel" class="d-none"><td>Click or Enter</td></tr>
                    <tr id="always"><td>Ctrl + scroll</td></tr>
                </table>
            </div>
        </div>
    `;
}

const checkbox = () => document.querySelector('input[type="checkbox"][name="showDetailPanel"]');
const rowHidden = (mode) =>
    document.querySelector(`[data-help-mode="${mode}"]`).classList.contains("d-none");

const button = () => document.querySelector(".btn-help");
const popover = () => document.getElementById("pedigree-chart-help-popover");
const pressKey = (key) => document.dispatchEvent(new KeyboardEvent("keydown", { key }));

describe("initHelpPopover", () => {
    beforeEach(() => {
        setupDom();
        initHelpPopover();
    });

    it("opens the popover on click and exposes the state on the button", () => {
        button().click();

        expect(popover().classList.contains("d-none")).toBe(false);
        expect(button().getAttribute("aria-expanded")).toBe("true");
    });

    it("closes the popover on the next click", () => {
        button().click();
        button().click();

        expect(popover().classList.contains("d-none")).toBe(true);
        expect(button().getAttribute("aria-expanded")).toBe("false");
    });

    it("closes an open popover on Escape", () => {
        button().click();

        pressKey("Escape");

        expect(popover().classList.contains("d-none")).toBe(true);
        expect(button().getAttribute("aria-expanded")).toBe("false");
    });

    it("keeps an open popover open on other keys", () => {
        button().click();

        pressKey("Enter");
        pressKey("a");

        expect(popover().classList.contains("d-none")).toBe(false);
        expect(button().getAttribute("aria-expanded")).toBe("true");
    });

    it("leaves a closed popover closed on Escape", () => {
        pressKey("Escape");

        expect(popover().classList.contains("d-none")).toBe(true);
        expect(button().getAttribute("aria-expanded")).toBe("false");
    });

    it("does nothing when the button points to a popover that the page does not have", () => {
        document.body.innerHTML =
            '<button class="btn-help" aria-expanded="false" aria-controls="missing">Help</button>';
        const errors = [];
        const onError = (event) => errors.push(event);

        window.addEventListener("error", onError);
        initHelpPopover();
        button().click();
        window.removeEventListener("error", onError);

        expect(errors).toEqual([]);
        expect(button().getAttribute("aria-expanded")).toBe("false");
    });

    it("binds the popover to its own button and not to another button of the page", () => {
        setupDom();
        document.body.insertAdjacentHTML("afterbegin", '<button id="other">Other</button>');
        initHelpPopover();

        document.getElementById("other").click();

        expect(popover().classList.contains("d-none")).toBe(true);

        button().click();

        expect(popover().classList.contains("d-none")).toBe(false);
        expect(button().getAttribute("aria-expanded")).toBe("true");
    });

    it("toggles the popover that the button names and no other popover", () => {
        document.body.innerHTML =
            '<div id="pedigree-chart-help-popover" class="help-popover d-none"></div>' +
            '<button class="btn-help" aria-expanded="false" aria-controls="named">Help</button>' +
            '<div id="named" class="help-popover d-none"></div>';
        initHelpPopover();

        button().click();

        expect(document.getElementById("named").classList.contains("d-none")).toBe(false);
        expect(popover().classList.contains("d-none")).toBe(true);
    });

    it("does nothing when the popover has no button", () => {
        document.body.innerHTML =
            '<div id="pedigree-chart-help-popover" class="help-popover d-none"></div>';

        expect(() => initHelpPopover()).not.toThrow();
        expect(() => pressKey("Escape")).not.toThrow();
    });

    it("does nothing on a page without a help button", () => {
        document.body.innerHTML = "";

        expect(() => initHelpPopover()).not.toThrow();
        expect(() => pressKey("Escape")).not.toThrow();
    });
});

describe("syncHelpMode", () => {
    it("shows the default entries while the detail panel is off", () => {
        setupDom();
        syncHelpMode();

        expect(rowHidden("default")).toBe(false);
        expect(rowHidden("panel")).toBe(true);
    });

    it("shows the panel entries while the detail panel is on", () => {
        setupDom({ panel: true });
        syncHelpMode();

        expect(rowHidden("default")).toBe(true);
        expect(rowHidden("panel")).toBe(false);
    });

    it("follows the checkbox of the detail panel on every call", () => {
        setupDom();
        syncHelpMode();

        checkbox().checked = true;
        syncHelpMode();

        expect(rowHidden("default")).toBe(true);
        expect(rowHidden("panel")).toBe(false);

        checkbox().checked = false;
        syncHelpMode();

        expect(rowHidden("default")).toBe(false);
        expect(rowHidden("panel")).toBe(true);
    });

    it("keeps the entries of the chart mode while the checkbox changes without a reload", () => {
        // The chart takes the mode when its data is loaded, so a tick that is not yet
        // submitted must not change the help.
        setupDom();
        initHelpPopover();
        syncHelpMode();

        checkbox().checked = true;
        checkbox().dispatchEvent(new Event("change", { bubbles: true }));
        document.querySelector(".btn-help").click();

        expect(rowHidden("default")).toBe(false);
        expect(rowHidden("panel")).toBe(true);
    });

    it("reads the checkbox of the detail panel and not another checkbox of the page", () => {
        setupDom();
        document.body.insertAdjacentHTML(
            "afterbegin",
            '<input type="checkbox" name="openNewTabOnClick" value="1" checked>',
        );
        syncHelpMode();

        expect(rowHidden("default")).toBe(false);
        expect(rowHidden("panel")).toBe(true);
    });

    it("leaves the rows as rendered without a checkbox even when they show the other mode", () => {
        setupDom();
        checkbox().remove();
        document.querySelector('[data-help-mode="default"]').classList.add("d-none");
        document.querySelector('[data-help-mode="panel"]').classList.remove("d-none");
        syncHelpMode();

        expect(rowHidden("default")).toBe(true);
        expect(rowHidden("panel")).toBe(false);
    });

    it("leaves an element outside the popover alone", () => {
        setupDom({ panel: true });
        document.body.insertAdjacentHTML(
            "beforeend",
            '<div data-help-mode="default" id="outside"></div>',
        );
        syncHelpMode();

        expect(document.getElementById("outside").classList.contains("d-none")).toBe(false);
    });

    it("leaves the entries that apply to both modes alone", () => {
        setupDom({ panel: true });
        syncHelpMode();

        expect(document.getElementById("always").classList.contains("d-none")).toBe(false);
    });

    it("keeps the markup as rendered when the page has no detail panel checkbox", () => {
        setupDom();
        checkbox().remove();

        expect(() => syncHelpMode()).not.toThrow();
        expect(rowHidden("default")).toBe(false);
        expect(rowHidden("panel")).toBe(true);
    });

    it("does nothing on a page without a help popover", () => {
        document.body.innerHTML =
            '<input type="checkbox" name="showDetailPanel" value="1" checked>';

        expect(() => syncHelpMode()).not.toThrow();
    });
});
