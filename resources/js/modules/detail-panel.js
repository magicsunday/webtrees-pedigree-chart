/**
 * This file is part of the package magicsunday/webtrees-pedigree-chart.
 *
 * For the full copyright and license information, please read the
 * LICENSE file distributed with this source code.
 */

/**
 * The viewport width in pixels from which the panel stands beside the chart. The
 * stylesheet repeats this value in its media query, a test keeps both in step.
 *
 * @type {number}
 */
export const PANEL_BREAKPOINT = 2000;

/**
 * The media query of the wide layout. The boundary is inclusive, so 2000 pixels are wide.
 *
 * @type {string}
 */
export const PANEL_MEDIA_QUERY = `(min-width: ${PANEL_BREAKPOINT}px)`;

/**
 * One fact of a person as the server serialises it.
 *
 * @typedef {object} PanelFact
 * @property {string} label     The plain text label of the fact
 * @property {string} date      The date as plain text, empty when there is none
 * @property {string} place     The place in the configured style, empty when there is none
 * @property {string} placeFull The full place name
 * @property {string} value     The value of the fact, empty when there is none
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
 * The callbacks the panel hands the actions of its buttons and its layout to.
 *
 * @typedef {object} PanelCallbacks
 * @property {(url: string) => void} onIndividual   Opens the individual page
 * @property {(url: string) => void} onCenter       Centres the chart on the person
 * @property {() => void}            onClose        Called when the panel closes and focus should go back to the chart
 * @property {() => void}            onLayoutChange Called when the layout changes between the wide and the narrow form
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
 * @property {((query: string) => MediaQueryList)|undefined} matchMedia
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
 * The detail panel shows the facts of the selected person. Below the breakpoint it is a Bootstrap
 * offcanvas that leaves the chart usable, from the breakpoint on a stylesheet turns the same element
 * into a column beside the chart. All texts that do not come from a person are in the markup of the
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
        this._suppressClose = false;

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

        // Bootstrap closes the offcanvas on Escape only while it is shown, so the wide column
        // needs a handler of its own that hands the focus back to the chart.
        this._element.addEventListener("keydown", (event) => {
            if (event.key === "Escape" && this.isWide()) {
                this._callbacks.onClose();
            }
        });

        this._element.addEventListener("hidden.bs.offcanvas", () => {
            if (this._suppressClose) {
                this._suppressClose = false;

                return;
            }

            this._callbacks.onClose();
        });

        this._query =
            typeof win.matchMedia === "function" ? win.matchMedia(PANEL_MEDIA_QUERY) : null;

        if (this._query !== null) {
            this._query.addEventListener("change", () => this.layoutChanged());
        }
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
        this._element.parentElement?.classList.add("has-detail-panel");
    }

    /**
     * Returns whether the panel stands beside the chart.
     *
     * @return {boolean}
     */
    isWide() {
        return this._query?.matches === true;
    }

    /**
     * Shows the facts of a person. Below the breakpoint the offcanvas opens. Re-selecting only
     * replaces the content.
     *
     * @param {PanelPerson} person The data of the person
     * @param {boolean}   focus  Whether the focus moves to the heading of the panel
     */
    select(person, focus = false) {
        this.render(person);

        if (!this.isWide()) {
            this.open(focus);

            return;
        }

        if (focus) {
            this._title.focus();
        }
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
     * Reacts on a change between the wide and the narrow layout. A panel that is shown as an
     * offcanvas is hidden when the layout turns wide, so that Bootstrap removes its state from the
     * element, and the chart gets the width it has now.
     *
     * @private
     */
    layoutChanged() {
        if (this.isWide() && this._element.classList.contains("show")) {
            this._suppressClose = true;
            this.offcanvas()?.hide();
        }

        this._callbacks.onLayoutChange();
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

        for (const fact of facts) {
            this._facts.appendChild(this.factRow(fact));
        }

        this._empty.hidden = facts.length > 0;
    }

    /**
     * Builds the term and the description of one fact.
     *
     * @param {PanelFact} fact The fact of the payload
     *
     * @return {DocumentFragment}
     *
     * @private
     */
    factRow(fact) {
        const row = document.createDocumentFragment();

        const term = document.createElement("dt");
        term.textContent = String(fact.label ?? "");

        const description = document.createElement("dd");
        const place = String(fact.place ?? "");
        const placeFull = String(fact.placeFull ?? "");

        /** @type {Array<[string, string]>} */
        const lines = [
            ["date", String(fact.date ?? "")],
            ["place", place],
            ["place-full", placeFull === place ? "" : placeFull],
            ["value", String(fact.value ?? "")],
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

        row.append(term, description);

        return row;
    }
}
