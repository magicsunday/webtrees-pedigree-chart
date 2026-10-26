/**
 * This file is part of the package magicsunday/webtrees-pedigree-chart.
 *
 * For the full copyright and license information, please read the
 * LICENSE file distributed with this source code.
 */

import * as d3 from "./d3.js";
import Configuration from "./configuration.js";
import Chart from "./chart.js";
import DetailPanel from "./detail-panel.js";

/**
 * @import { Selection } from "d3-selection"
 */

/**
 * The application class.
 *
 * @author  Rico Sonntag <mail@ricosonntag.de>
 * @license https://opensource.org/licenses/GPL-3.0 GNU General Public License v3.0
 * @link    https://github.com/magicsunday/webtrees-pedigree-chart/
 */
export class PedigreeChart {
    /**
     * Constructor.
     *
     * @param {string} selector The CSS selector of the HTML element used to assign the chart too
     * @param {object} options  A list of options passed from outside to the application
     *
     * @param {{zoom: string, move: string}} options.labels
     * @param {boolean}   options.rtl
     * @param {string}    options.treeLayout
     * @param {boolean}   options.openNewTabOnClick
     * @param {boolean}   options.showAlternativeName
     * @param {boolean}   options.showFamilyColors
     * @param {boolean}   options.showDetailPanel
     * @param {string}    options.paternalColor
     * @param {string}    options.maternalColor
     * @param {string}    options.nameAbbreviation
     * @param {string[]}  options.cssFiles
     * @param {NodeDatum} options.data
     */
    constructor(selector, options) {
        this._selector = selector;
        this._parent = /** @type {Selection<HTMLElement, unknown, HTMLElement, unknown>} */ (
            d3.select(this._selector)
        );

        // Set up configuration
        this._configuration = new Configuration(
            options.labels,
            options.treeLayout,
            options.openNewTabOnClick,
            options.showAlternativeName,
            options.showFamilyColors,
            options.paternalColor,
            options.maternalColor,
            options.nameAbbreviation,
            options.rtl,
            options.showDetailPanel,
        );

        this._cssFiles = options.cssFiles;

        // Set up chart instance
        this._chart = new Chart(this._parent, this._configuration);

        // The panel is set up before the first draw, so the view box is calculated with the
        // width the chart really has beside the panel.
        this.initDetailPanel();

        this.init();
        this.draw(options.data);
    }

    /**
     * Returns the configuration object.
     *
     * @return {Configuration}
     */
    get configuration() {
        return this._configuration;
    }

    /**
     * Connects the detail panel of the page with the chart. A chart without the detail panel
     * leaves the panel element of the page hidden.
     *
     * @private
     */
    initDetailPanel() {
        const element = document.getElementById("webtrees-pedigree-detail-panel");

        if (!this._configuration.showDetailPanel || element === null) {
            return;
        }

        const panel = new DetailPanel(element, {
            onIndividual: (url) => this._chart.redirectToIndividual(url),
            onCenter: (url) => this._chart.update(url),
            onClose: () => this._chart.restoreFocus(),
            onLayoutChange: () => this._chart.updateViewBox(),
        });

        panel.enable();
        this._chart.detailPanel = panel;
    }

    /**
     * @private
     */
    init() {
        // Bind click event on center button
        d3.select("#centerButton").on("click", () => this._chart.center());

        // Bind click event on export as PNG button
        d3.select("#exportPNG").on("click", () => this.exportPNG());

        // Bind click event on export as SVG button
        d3.select("#exportSVG").on("click", () => this.exportSVG());

        this.addEventListeners();
    }

    /**
     * Add event listeners.
     */
    addEventListeners() {
        // Listen for fullscreen change event
        document.addEventListener("fullscreenchange", () => {
            if (document.fullscreenElement) {
                // Add attribute to the body element to indicate fullscreen state
                document.body.setAttribute("fullscreen", "");
            } else {
                document.body.removeAttribute("fullscreen");
            }

            this._chart.updateViewBox();
        });

        // Listen for orientation change event
        screen.orientation.addEventListener("change", () => {
            this._chart.updateViewBox();
        });
    }

    /**
     * Updates the chart.
     *
     * @param {string} url The update url
     */
    update(url) {
        this._chart.update(url);
    }

    /**
     * Draws the chart.
     *
     * @param {NodeDatum} data The JSON encoded chart data
     */
    draw(data) {
        this._chart.data = data;
        this._chart.draw();
    }

    /**
     * Exports the chart as PNG image and triggers a download.
     *
     * @private
     */
    exportPNG() {
        this._chart.svg.export("png").svgToImage(this._chart.svg, "pedigree-chart.png");
    }

    /**
     * Exports the chart as SVG image and triggers a download.
     *
     * @private
     */
    exportSVG() {
        this._chart.svg.export("svg").svgToImage(this._chart.svg, "pedigree-chart.svg");
    }
}
