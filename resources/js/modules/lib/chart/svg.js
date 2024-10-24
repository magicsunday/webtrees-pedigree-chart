/**
 * This file is part of the package magicsunday/webtrees-pedigree-chart.
 *
 * For the full copyright and license information, please read the
 * LICENSE file distributed with this source code.
 */

import Defs from "./svg/defs";
import Zoom from "./svg/zoom";
import ExportFactory from "./svg/export-factory";

/**
 * SVG class
 *
 * @author  Rico Sonntag <mail@ricosonntag.de>
 * @license https://opensource.org/licenses/GPL-3.0 GNU General Public License v3.0
 * @link    https://github.com/magicsunday/webtrees-pedigree-chart/
 */
export default class Svg
{
    /**
     * Constructor.
     *
     * @param {Selection}     parent        The selected D3 parent element container
     * @param {Configuration} configuration The application configuration
     */
    constructor(parent, configuration)
    {
        // Create the <svg> element
        this._element       = parent.append("svg");
        this._defs          = new Defs(this._element);

        this._visual        = null;
        this._zoom          = null;
        this._configuration = configuration;

        this.init();
    }

    /**
     * Returns the SVG definition instance.
     *
     * @returns {Defs}
     */
    get defs()
    {
        return this._defs;
    }

    /**
     * Returns the SVG definition instance.
     *
     * @returns {Zoom}
     */
    get zoom()
    {
        return this._zoom;
    }

    /**
     *
     *
     * @returns {Selection}
     */
    get visual()
    {
        return this._visual;
    }

    /**
     * Initialize the <svg> element.
     *
     * @private
     */
    init()
    {
        // Add SVG element
        this._element
            .attr("width", "100%")
            .attr("height", "100%")
            .attr("text-rendering", "optimizeLegibility")
            .attr("text-anchor", "middle")
            .attr("xmlns:xlink", "https://www.w3.org/1999/xlink");

        // new Filter(this._defs.get());
    }

    /**
     * Initialize the <svg> element events.
     *
     * @param {Overlay} overlay
     */
    initEvents(overlay)
    {
        this._element
            .on("contextmenu", (event) => event.preventDefault())
            .on("wheel", (event) => {
                if (!event.ctrlKey) {
                    overlay.show(
                        this._configuration.labels.zoom,
                        300,
                        () => {
                            overlay.hide(200, 600);
                        }
                    );
                }
            })
            .on("touchend", (event) => {
                if (event.touches.length < 2) {
                    overlay.hide(0, 600);
                }
            })
            .on("touchmove", (event) => {
                if (event.touches.length >= 2) {
                    // Hide tooltip on more than two fingers
                    overlay.hide();
                } else {
                    // Show tooltip if less than two fingers are used
                    overlay.show(this._configuration.labels.move);
                }
            })
            .on("click", (event) => this.doStopPropagation(event), true);

        if (this._configuration.rtl) {
            this._element.classed("rtl", true);
        }

        // Add a group
        this._visual = this._element.append("g");

        // Add zoom
        this._zoom = new Zoom(this._visual);
        this._element.call(this._zoom.get());
    }

    /**
     * Prevent default click and stop propagation.
     *
     * @param {Event} event
     *
     * @private
     */
    doStopPropagation(event)
    {
        if (event.defaultPrevented) {
            event.stopPropagation();
        }
    }

    /**
     * Exports the chart as PNG image and triggers a download.
     *
     * @param {string} type The export file type (either "png" or "svg")
     *
     * @returns {PngExport|SvgExport}
     */
    export(type )
    {
        const factory = new ExportFactory();
        return factory.createExport(type);
    }

    /**
     * @returns {Node}
     */
    node()
    {
        return this._element.node();
    }

    /**
     * @param {function|string|null} select
     *
     * @returns {Selection}
     */
    selectAll(select)
    {
        return this._element.selectAll(select);
    }

    /**
     * @param {string} name
     *
     * @returns {string|this}
     */
    style(name)
    {
        return this._element.style(...arguments);
    }

    /**
     * @param {string} name
     *
     * @returns {string|this}
     */
    attr(name)
    {
        return this._element.attr(...arguments);
    }

    /**
     * @returns {Transition}
     */
    transition()
    {
        return this._element.transition();
    }
}
