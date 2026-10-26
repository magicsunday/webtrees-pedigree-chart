/**
 * This file is part of the package magicsunday/webtrees-pedigree-chart.
 *
 * For the full copyright and license information, please read the
 * LICENSE file distributed with this source code.
 */

/**
 * One fact of a person as the server serialises it.
 *
 * @typedef {object} PanelFact
 * @property {string} label     The plain text label of the fact
 * @property {string} date      The date as plain text, empty when there is none
 * @property {string} place     The place name as the server formats it, empty when there is none
 * @property {string} placeFull The full place name
 * @property {string} value     The value of the fact, empty when there is none
 * @property {string} partner   The plain text name of the other spouse of a family event, empty otherwise
 */

/**
 * The data of a person that the panel reads.
 *
 * @typedef {object} PanelPerson
 * @property {string}                     name       The plain text name
 * @property {string}                     url        The URL of the individual page
 * @property {string}                     updateUrl  The URL that centres the chart on the person
 * @property {number}                     generation The generation of the person, 1 for the root
 * @property {(PanelFact|null)[]|undefined} facts    The fact slots, absent without the panel on the server
 */

/**
 * The callbacks the panel hands the actions of its buttons and its closing to.
 *
 * @typedef {object} PanelCallbacks
 * @property {(url: string) => void} onIndividual   Opens the individual page
 * @property {(url: string) => void} onCenter       Centres the chart on the person
 * @property {() => void}            onClose        Called when the panel closes and focus should go back to the chart
 */

/**
 * The Offcanvas part of Bootstrap that the panel uses.
 *
 * @typedef {object} OffcanvasInstance
 * @property {() => void} show
 * @property {() => void} hide
 */

/**
 * The part of the window the panel depends on, so tests can hand in stand-ins.
 *
 * @typedef {object} PanelWindow
 * @property {{Offcanvas?: {getOrCreateInstance: (element: Element, options: object) => OffcanvasInstance}}|undefined} bootstrap
 */

/**
 * Tells a fact of the payload from the empty slots and from anything malformed.
 *
 * @param {unknown} value A slot of the facts of a person
 *
 * @return {value is PanelFact}
 */
function isFact(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
}

/**
 * The detail panel shows the facts of the selected person. It is a Bootstrap offcanvas without a
 * backdrop that opens on a selection and leaves the chart usable. All texts that do not come from a person are in the markup of the
 * page, so they are translated on the server, and everything that comes from a person is written
 * with textContent only.
 *
 * @author  Rico Sonntag <mail@ricosonntag.de>
 * @license https://opensource.org/licenses/GPL-3.0 GNU General Public License v3.0
 * @link    https://github.com/magicsunday/webtrees-pedigree-chart/
 */
export default class DetailPanel {
    /**
     * Constructor.
     *
     * @param {HTMLElement}    element   The panel element of the page
     * @param {PanelCallbacks} callbacks The actions of the panel
     * @param {PanelWindow}    win       The window, replaceable for tests
     */
    constructor(
        element,
        callbacks,
        win = /** @type {PanelWindow} */ (/** @type {unknown} */ (window)),
    ) {
        this._element = element;
        this._callbacks = callbacks;
        this._window = win;

        this._title = this.part("title");
        this._hint = this.part("hint");
        this._facts = this.part("facts");
        this._empty = this.part("empty");
        this._actions = this.part("actions");
        this._individualButton = this.part("individual");
        this._centerButton = this.part("center");

        this._individualUrl = "";
        this._centerUrl = "";

        this._individualButton.addEventListener("click", () => {
            if (this._individualUrl !== "") {
                this._callbacks.onIndividual(this._individualUrl);
            }
        });

        this._centerButton.addEventListener("click", () => {
            if (this._centerUrl !== "") {
                this._callbacks.onCenter(this._centerUrl);
            }
        });

        this._skipFocusReturn = false;
        this._outsideClick = (/** @type {Event} */ event) => this.closeOnOutsideClick(event);
        this._escape = (/** @type {KeyboardEvent} */ event) => this.closeOnEscape(event);

        // A click beside the panel closes it. The listener only lives while the panel is shown, so
        // the click that opened it cannot close it again.
        this._element.addEventListener("shown.bs.offcanvas", () => {
            document.addEventListener("click", this._outsideClick);
            document.addEventListener("keydown", this._escape);

            // The chart stays operable beside the panel, so the panel is no modal dialog
            this._element.removeAttribute("aria-modal");
            this._element.setAttribute("role", "complementary");
        });

        // Bootstrap closes the offcanvas on Escape and by its close button, and the focus goes back
        // to the chart then. After a click somewhere else the focus stays where the user put it.
        this._element.addEventListener("hidden.bs.offcanvas", () => {
            document.removeEventListener("click", this._outsideClick);
            document.removeEventListener("keydown", this._escape);

            if (this._skipFocusReturn) {
                this._skipFocusReturn = false;

                return;
            }

            this._callbacks.onClose();
        });
    }

    /**
     * Closes the panel on Escape while the focus is outside of it, for example on a person of the
     * chart. Inside the panel Bootstrap closes it, and the focus goes back to the chart then.
     *
     * @param {KeyboardEvent} event The key press
     *
     * @private
     */
    closeOnEscape(event) {
        if (
            event.key !== "Escape" ||
            (event.target instanceof Node && this._element.contains(event.target))
        ) {
            return;
        }

        this.dismiss();
    }

    /**
     * Closes the panel on a click that is neither inside the panel nor on a person, as a click on a
     * person only swaps the content of the panel.
     *
     * @param {Event} event The click
     *
     * @private
     */
    closeOnOutsideClick(event) {
        const target = event.target;

        if (
            !(target instanceof Element) ||
            this._element.contains(target) ||
            target.closest("g.person") !== null
        ) {
            return;
        }

        this.dismiss();
    }

    /**
     * Hides the panel without handing the focus back to the chart, as the user has put it
     * somewhere else.
     *
     * @private
     */
    dismiss() {
        this._skipFocusReturn = true;
        this.offcanvas()?.hide();
    }

    /**
     * Returns the child of the panel that carries the given data-panel name.
     *
     * @param {string} name The value of the data-panel attribute
     *
     * @return {HTMLElement}
     *
     * @private
     */
    part(name) {
        const part = /** @type {HTMLElement|null} */ (
            this._element.querySelector(`[data-panel="${name}"]`)
        );

        if (part === null) {
            throw new Error(`The detail panel has no part "${name}"`);
        }

        return part;
    }

    /**
     * Makes the panel part of the page. Without this the panel stays hidden, so a chart
     * without the panel is not changed.
     */
    enable() {
        this._element.hidden = false;
    }

    /**
     * Shows the facts of a person and opens the offcanvas. Re-selecting only replaces the content.
     *
     * @param {PanelPerson} person The data of the person
     * @param {boolean}   focus  Whether the focus moves to the heading of the panel
     */
    select(person, focus = false) {
        this.render(person);
        this.open(focus);
    }

    /**
     * Opens the offcanvas, and moves the focus into it once it is shown.
     *
     * @param {boolean} focus Whether the focus moves to the heading
     *
     * @private
     */
    open(focus) {
        const offcanvas = this.offcanvas();

        if (offcanvas === null) {
            this._element.classList.add("show");

            if (focus) {
                this._title.focus();
            }

            return;
        }

        if (focus) {
            if (this._element.classList.contains("show")) {
                this._title.focus();
            } else {
                this._element.addEventListener("shown.bs.offcanvas", () => this._title.focus(), {
                    once: true,
                });
            }
        }

        offcanvas.show();
    }

    /**
     * Returns the Offcanvas instance of the panel, or null when Bootstrap is not available.
     *
     * @return {OffcanvasInstance|null}
     *
     * @private
     */
    offcanvas() {
        const offcanvas = this._window.bootstrap?.Offcanvas;

        if (offcanvas === undefined) {
            return null;
        }

        return offcanvas.getOrCreateInstance(this._element, { scroll: true, backdrop: false });
    }

    /**
     * Writes the person into the panel.
     *
     * @param {PanelPerson} person The data of the person
     *
     * @private
     */
    render(person) {
        this._title.textContent = String(person?.name ?? "");
        this._hint.hidden = true;
        this._actions.hidden = false;

        this._individualUrl = String(person?.url ?? "");
        this._centerUrl = person?.generation === 1 ? "" : String(person?.updateUrl ?? "");

        this._individualButton.hidden = this._individualUrl === "";
        this._centerButton.hidden = this._centerUrl === "";

        this._facts.replaceChildren();

        const facts = Array.isArray(person?.facts) ? person.facts.filter(isFact) : [];

        let rows = 0;

        for (const fact of facts) {
            const row = this.factRow(fact);

            if (row !== null) {
                this._facts.appendChild(row);
                ++rows;
            }
        }

        this._empty.hidden = rows > 0;
    }

    /**
     * Builds the term and the description of one fact, or returns null when the fact has nothing
     * to show. The GEDCOM value "Y" only says that the event took place, so it is not shown. The
     * name of the other spouse of a marriage or divorce comes first, as it says who the event is
     * about.
     *
     * @param {PanelFact} fact The fact of the payload
     *
     * @return {DocumentFragment|null}
     *
     * @private
     */
    factRow(fact) {
        const row = document.createDocumentFragment();

        const term = document.createElement("dt");
        term.textContent = String(fact.label ?? "");

        const description = document.createElement("dd");
        const placeFull = String(fact.placeFull ?? "");
        const value = String(fact.value ?? "");

        /** @type {Array<[string, string]>} */
        const lines = [
            ["partner", String(fact.partner ?? "")],
            ["value", value === "Y" ? "" : value],
            ["date", String(fact.date ?? "")],
            ["place", placeFull === "" ? String(fact.place ?? "") : placeFull],
        ];

        for (const [name, text] of lines) {
            if (text === "") {
                continue;
            }

            const line = document.createElement("div");
            line.className = `detail-${name}`;
            line.textContent = text;
            description.appendChild(line);
        }

        if (description.childElementCount === 0) {
            return null;
        }

        row.append(term, description);

        return row;
    }
}
