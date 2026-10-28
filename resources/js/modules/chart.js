/**
 * This file is part of the package magicsunday/webtrees-pedigree-chart.
 *
 * For the full copyright and license information, please read the
 * LICENSE file distributed with this source code.
 */
import * as d3 from "./d3.js";
import Hierarchy from "./hierarchy.js";
import { PanelSelection } from "@magicsunday/webtrees-chart-lib/chart-core";
import { ChartOverlay as Overlay } from "@magicsunday/webtrees-chart-lib/infra";
import { LinkedTreeSvg as Svg } from "@magicsunday/webtrees-chart-lib/linked-tree";
import Tree from "./tree.js";

/**
 * @import { Selection } from "d3-selection"
 * @import Configuration from "./configuration.js"
 * @import { DetailPanel, PanelPerson } from "@magicsunday/webtrees-chart-lib/chart-core"
 */

const MIN_PADDING = 1; // Minimum padding around view box in "rem"

/**
 * Returns the text that a person box shows, one line per text element. The tspans carry the
 * visible text, a title next to them is only the tooltip of the same text.
 *
 * @param {unknown} node The person element
 *
 * @return {string} The visible lines joined by a space, empty if the box shows no text
 */
function visibleText(node) {
    if (!(node instanceof Element)) {
        return "";
    }

    return Array.from(node.querySelectorAll("text"))
        .map((text) =>
            Array.from(text.querySelectorAll("tspan"))
                .map((tspan) => tspan.textContent ?? "")
                .join(" ")
                .trim(),
        )
        .filter((line) => line !== "")
        .join(" ");
}

/**
 * This class handles the overall chart creation.
 *
 * @author  Rico Sonntag <mail@ricosonntag.de>
 * @license https://opensource.org/licenses/GPL-3.0 GNU General Public License v3.0
 * @link    https://github.com/magicsunday/webtrees-pedigree-chart/
 */
export default class Chart {
    /**
     * Constructor.
     *
     * @param {Selection<HTMLElement, unknown, HTMLElement, unknown>} parent The selected D3 parent element container
     * @param {Configuration}                                          configuration The application configuration
     */
    constructor(parent, configuration) {
        this._configuration = configuration;
        this._parent = parent;
        this._hierarchy = new Hierarchy(this._configuration);
        /** @type {NodeDatum|null} */
        this._data = null;
        /** @type {Svg} */
        this._svg = /** @type {Svg} */ (/** @type {unknown} */ (null));
        /** @type {Overlay} */
        this._overlay = /** @type {Overlay} */ (/** @type {unknown} */ (null));
        /** @type {DetailPanel|null} */
        this._detailPanel = null;
        /** @type {PanelSelection<NodeDatum>} */
        this._selection = new PanelSelection(() => this._svg?.visual);
    }

    /**
     * Sets the detail panel that shows the selected person.
     *
     * @param {DetailPanel|null} panel The detail panel
     */
    set detailPanel(panel) {
        this._detailPanel = panel;
    }

    /**
     * Returns the SVG instance.
     *
     * @return {Svg}
     */
    get svg() {
        return this._svg;
    }

    /**
     * Returns the parent container.
     *
     * @return {Selection<HTMLElement, unknown, HTMLElement, unknown>}
     */
    get parent() {
        return this._parent;
    }

    /**
     * Returns the chart data.
     *
     * @return {NodeDatum|null}
     */
    get data() {
        return this._data;
    }

    /**
     * Sets the chart data.
     *
     * @param {NodeDatum} value The chart data
     */
    set data(value) {
        this._data = value;

        // Create the hierarchical data structure
        this._hierarchy.init(this._data);
    }

    /**
     * Convert relative root element's font-size into pixel size.
     *
     * @param {number} rem The relative size
     *
     * @return {number}
     */
    convertRemToPixels(rem) {
        return rem * parseFloat(window.getComputedStyle(document.documentElement).fontSize);
    }

    /**
     * Update/Calculate the viewBox attribute of the SVG element.
     */
    updateViewBox() {
        // Set width/height attributes
        this.svg.attr("width", "100%").attr("height", "100%");

        const padding = this.convertRemToPixels(MIN_PADDING);

        // Get bounding boxes
        // Both selections hold exactly one element once draw() has run
        const svgBoundingBox = /** @type {SVGGElement} */ (this.svg.visual.node()).getBBox();
        const clientBoundingBox = /** @type {HTMLElement} */ (
            this.parent.node()
        ).getBoundingClientRect();

        // View box should have at least the same width/height as the parent element
        let viewBoxWidth = Math.max(clientBoundingBox.width, svgBoundingBox.width);
        let viewBoxHeight = Math.max(clientBoundingBox.height, svgBoundingBox.height);

        // Calculate offset to center chart inside svg.
        // Use plain division, `>> 1` casts to int32 and silently wraps to a
        // wrong value once the difference leaves the int32 range.
        const offsetX = (viewBoxWidth - svgBoundingBox.width) / 2;
        const offsetY = (viewBoxHeight - svgBoundingBox.height) / 2;

        // Adjust view box dimensions by padding and offset
        const viewBoxLeft = Math.ceil(svgBoundingBox.x - offsetX - padding);
        const viewBoxTop = Math.ceil(svgBoundingBox.y - offsetY - padding);

        // In fullscreen mode, use the full available height
        // (buttonbar is now overlayed, so no offset needed)
        if (document.fullscreenElement) {
            // Set width/height attributes
            this.svg
                .attr("width", clientBoundingBox.width)
                .attr("height", clientBoundingBox.height);
        }

        // Final width/height of view box (padding * 2, same int32 caveat as above)
        viewBoxWidth = Math.ceil(viewBoxWidth + padding * 2);
        viewBoxHeight = Math.ceil(viewBoxHeight + padding * 2);

        // Set view box attribute
        this.svg.attr("viewBox", [viewBoxLeft, viewBoxTop, viewBoxWidth, viewBoxHeight]);
    }

    /**
     * Resets the chart to initial zoom level and position.
     */
    center() {
        this.svg.transition().duration(750).call(this.svg.zoom.get().transform, d3.zoomIdentity);
    }

    /**
     * This method draws the chart.
     */
    draw() {
        // Remove previously created content
        this._parent.html("");

        // Create the <svg> element
        this._svg = new Svg(this._parent, this._configuration);

        // Overlay must be placed after the <svg> element
        this._overlay = new Overlay(this._parent);

        // Init the <svg> events
        this._svg.initEvents(this._overlay);

        // Create tree
        new Tree(this._svg, this._configuration, this._hierarchy);

        this.updateViewBox();

        // TODO Add separate button to toggle transition to keep clicking?
        this.bindClickEventListener();
    }

    /**
     * This method bind the "click" event listeners to a "person" element.
     */
    bindClickEventListener() {
        const that = this;

        this._svg.visual
            .selectAll("g.person")
            .filter((person) => person.data.data.xref !== "" || person.data.data.url !== "")
            .each(function (person) {
                const element = d3.select(this);

                element.on("click", () => that.personClick(person.data));

                if (that._configuration.showDetailPanel) {
                    that._selection.makeOperable(element, person, (datum, byKeyboard) =>
                        that.personClick(datum, byKeyboard),
                    );

                    // The box shows the dates next to the name, so a label with the bare name
                    // would not contain the visible text (WCAG 2.5.3)
                    const label = visibleText(this);

                    if (label !== "") {
                        element.attr("aria-label", label);
                    }
                }
            });

        this._selection.apply();
    }

    /**
     * Removes the selection, so no person stays marked once the panel has closed.
     */
    clearSelection() {
        this._selection.clear();
    }

    /**
     * Gives the focus back to the selected person, if it is still in the chart.
     */
    restoreFocus() {
        this._selection.restoreFocus();
    }

    /**
     * Method triggers either the "update" or "individual" method on the click
     * on a person.
     *
     * @param {NodeDatum} data        The D3 data object
     * @param {boolean}   byKeyboard  Whether a key triggered the activation
     *
     * @private
     */
    personClick(data, byKeyboard = false) {
        // "Add a parent" placeholder: empty xref + url pointing at the
        // webtrees core add-parent route. Always navigate there directly,
        // honouring the same new-tab preference as real individuals.
        if (data.data.xref === "" && data.data.url !== "") {
            this.redirectToIndividual(data.data.url);

            return;
        }

        // With the detail panel a click selects the person, the panel offers both actions
        if (this._configuration.showDetailPanel && this._detailPanel !== null) {
            this._selection.select(data);
            this._detailPanel.select(
                /** @type {PanelPerson} */ (/** @type {unknown} */ (data.data)),
                byKeyboard,
            );

            return;
        }

        // Trigger either "update" or "redirectToIndividual" method on click depending on person in chart
        data.data.generation === 1
            ? this.redirectToIndividual(data.data.url)
            : this.update(data.data.updateUrl);
    }

    /**
     * Redirects to the individual page.
     *
     * @param {string} url The individual URL
     */
    redirectToIndividual(url) {
        if (this._configuration.openNewTabOnClick) {
            window.open(url, "_blank");
        } else {
            window.location.href = url;
        }
    }

    /**
     * Updates the chart with the data of the selected individual.
     *
     * @param {string} url The update URL
     */
    update(url) {
        // See update.js for a possible AJAX only update solution, but which requires some additional work
        window.location.href = url;
    }
}
