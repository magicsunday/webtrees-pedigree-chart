/**
 * This file is part of the package magicsunday/webtrees-pedigree-chart.
 *
 * For the full copyright and license information, please read the
 * LICENSE file distributed with this source code.
 */
import * as d3 from "./d3.js";
import Hierarchy from "./hierarchy.js";
import Svg from "./chart/svg.js";
import { ChartOverlay as Overlay } from "@magicsunday/webtrees-chart-lib";
import Tree from "./tree.js";

/**
 * @import { Selection } from "d3-selection"
 * @import Configuration from "./configuration.js"
 */

const _MIN_HEIGHT = 300;
const MIN_PADDING = 1; // Minimum padding around view box in "rem"

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
        /** @type {Data|null} */
        this._data = null;
        /** @type {Svg} */
        this._svg = /** @type {Svg} */ (/** @type {unknown} */ (null));
        /** @type {Overlay} */
        this._overlay = /** @type {Overlay} */ (/** @type {unknown} */ (null));
    }

    /**
     * Returns the SVG instance.
     *
     * @returns {Svg}
     */
    get svg() {
        return this._svg;
    }

    /**
     * Returns the parent container.
     *
     * @returns {Selection<HTMLElement, unknown, HTMLElement, unknown>}
     */
    get parent() {
        return this._parent;
    }

    /**
     * Returns the chart data.
     *
     * @returns {Data|null}
     */
    get data() {
        return this._data;
    }

    /**
     * Sets the chart data.
     *
     * @param {Data} value The chart data
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
     * @returns {number}
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
        const svgBoundingBox = this.svg.visual.node().getBBox();
        const clientBoundingBox = this.parent.node().getBoundingClientRect();

        // View box should have at least the same width/height as the parent element
        let viewBoxWidth = Math.max(clientBoundingBox.width, svgBoundingBox.width);
        let viewBoxHeight = Math.max(clientBoundingBox.height, svgBoundingBox.height);

        // Calculate offset to center chart inside svg
        const offsetX = (viewBoxWidth - svgBoundingBox.width) >> 1;
        const offsetY = (viewBoxHeight - svgBoundingBox.height) >> 1;

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

        // Final width/height of view box
        viewBoxWidth = Math.ceil(viewBoxWidth + (padding << 1));
        viewBoxHeight = Math.ceil(viewBoxHeight + (padding << 1));

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
                d3.select(this).on("click", () => that.personClick(person.data));
            });
    }

    /**
     * Method triggers either the "update" or "individual" method on the click on a person.
     *
     * @param {object} data The D3 data object
     *
     * @private
     */
    personClick(data) {
        // "Add a parent" placeholder: empty xref + url pointing at the
        // webtrees core add-parent route. Always navigate there directly,
        // honouring the same new-tab preference as real individuals.
        if (data.data.xref === "" && data.data.url !== "") {
            this.redirectToIndividual(data.data.url);

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
     *
     * @private
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
