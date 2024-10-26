/**
 * This file is part of the package magicsunday/webtrees-pedigree-chart.
 *
 * For the full copyright and license information, please read the
 * LICENSE file distributed with this source code.
 */

import * as d3 from "./lib/d3";
import Configuration from "./custom/configuration";
import Chart from "./lib/chart";

/**
 * The application class.
 *
 * @author  Rico Sonntag <mail@ricosonntag.de>
 * @license https://opensource.org/licenses/GPL-3.0 GNU General Public License v3.0
 * @link    https://github.com/magicsunday/webtrees-pedigree-chart/
 */
export class PedigreeChart
{
    /**
     * Constructor.
     *
     * @param {string} selector The CSS selector of the HTML element used to assign the chart too
     * @param {object} options  A list of options passed from outside to the application
     *
     * @param {string[]} options.labels
     * @param {boolean}  options.rtl
     * @param {number}   options.generations
     * @param {boolean}  options.showEmptyBoxes
     * @param {string}   options.treeLayout
     * @param {boolean}  options.openNewTabOnClick
     * @param {boolean}  options.showAlternativeName
     * @param {string[]} options.cssFiles
     * @param {Data[]}   options.data
     */
    constructor(selector, options)
    {
        this._selector = selector;
        this._parent   = d3.select(this._selector);

        // Set up configuration
        this._configuration = new Configuration(
            options.labels,
            options.generations,
            options.showEmptyBoxes,
            options.treeLayout,
            options.openNewTabOnClick,
            options.showAlternativeName,
            options.rtl
        );

        this._cssFiles = options.cssFiles;

        // Set up chart instance
        this._chart = new Chart(this._parent, this._configuration);

        this.init();
        this.draw(options.data);
    }

    /**
     * Returns the configuration object.
     *
     * @returns {Configuration}
     */
    get configuration()
    {
        return this._configuration;
    }

    /**
     * @private
     */
    init()
    {
        // Bind click event on center button
        d3.select("#centerButton")
            .on("click", () => this._chart.center());

        // Bind click event on export as PNG button
        d3.select("#exportPNG")
            .on("click", () => this.exportPNG());

        // Bind click event on export as SVG button
        d3.select("#exportSVG")
            .on("click", () => this.exportSVG());

        this.addEventListeners();
    }

    /**
     * Add event listeners.
     */
    addEventListeners()
    {
        // Listen for fullscreen change event
        document.addEventListener(
            "fullscreenchange",
            () => {
                if (document.fullscreenElement) {
                    // Add attribute to the body element to indicate fullscreen state
                    document.body.setAttribute("fullscreen", "");
                } else {
                    document.body.removeAttribute("fullscreen");
                }

                this._chart.updateViewBox();
            }
        );

        // Listen for orientation change event
        screen.orientation.addEventListener(
            "change",
            () => {
                this._chart.updateViewBox();
            });
    }

    /**
     * Updates the chart.
     *
     * @param {string} url The update url
     */
    update(url)
    {
        this._chart.update(url);
    }

    /**
     * Draws the chart.
     *
     * @param {object} data The JSON encoded chart data
     */
    draw(data)
    {
        this._chart.data = data;
        this._chart.draw();
    }

    /**
     * Exports the chart as PNG image and triggers a download.
     *
     * @private
     */
    exportPNG()
    {
        this._chart.svg
            .export('png')
            .svgToImage(this._chart.svg, "pedigree-chart.png");
    }

    /**
     * Exports the chart as SVG image and triggers a download.
     *
     * @private
     */
    exportSVG()
    {
        this._chart.svg
            .export('svg')
            .svgToImage(
                this._chart.svg,
                this._cssFiles,
                "webtrees-pedigree-chart-container",
                "pedigree-chart.svg"
            );
    }
}
