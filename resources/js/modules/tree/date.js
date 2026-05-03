/**
 * This file is part of the package magicsunday/webtrees-pedigree-chart.
 *
 * For the full copyright and license information, please read the
 * LICENSE file distributed with this source code.
 */

import { measureText } from "@magicsunday/webtrees-chart-lib";
import { LAYOUT_VERTICAL_NODE_HEIGHT_OFFSET } from "../constants.js";

/**
 * The class handles the creation of the tree.
 *
 * @author  Rico Sonntag <mail@ricosonntag.de>
 * @license https://opensource.org/licenses/GPL-3.0 GNU General Public License v3.0
 * @link    https://github.com/magicsunday/webtrees-pedigree-chart/
 */
export default class DateRenderer {
    /**
     * Constructor.
     *
     * @param {Svg}         svg
     * @param {Orientation} orientation
     * @param {Image}       image
     * @param {Text}        text
     */
    constructor(svg, orientation, image, text) {
        this._svg = svg;
        this._orientation = orientation;
        this._image = image;
        this._text = text;
    }

    /**
     * Add the individual dates to the given parent element.
     *
     * @param {Selection} parent The parent element to which the elements are to be attached
     *
     * @public
     */
    appendDate(parent) {
        const table = parent.append("g");

        // Top/Bottom and Bottom/Top
        if (this._orientation.isVertical) {
            const enter = table
                .selectAll("text.date")
                .data((d) => [
                    {
                        label: d.data.data.timespan,
                        withImage: true,
                    },
                ])
                .enter();

            let dateYOffset = this._text.y + 45;

            if (this._svg._configuration.showAlternativeName) {
                dateYOffset += LAYOUT_VERTICAL_NODE_HEIGHT_OFFSET;
            }

            const text = enter
                .append("text")
                .attr("class", "date")
                .attr("text-anchor", "middle")
                .attr("alignment-baseline", "central")
                .attr("y", dateYOffset);

            text.append("title").text((d) => d.label);

            const tspan = text.append("tspan");

            tspan.text((d) => this.truncateDate(tspan, d.label, this._text.width));

            return;
        }

        const offset = 30;

        const enter = table
            .selectAll("text")
            .data((d) => {
                const data = [];

                if (d.data.data.birth) {
                    data.push({
                        icon: "★",
                        label: d.data.data.birth,
                        birth: true,
                        withImage: d.data.data.thumbnail !== "",
                    });
                }

                if (d.data.data.death) {
                    data.push({
                        icon: "†",
                        label: d.data.data.death,
                        death: true,
                        withImage: d.data.data.thumbnail !== "",
                    });
                }

                return data;
            })
            .enter();

        enter.call((g) => {
            const col1 = g
                .append("text")
                .attr("fill", "currentColor")
                .attr("text-anchor", "middle")
                .attr("dominant-baseline", "middle")
                .attr("x", (d) => this.textX(d))
                // Minor offset here to better center the icon
                .attr("y", (_d, i) => this._text.y + offset + (i === 0 ? 0 : 21));

            col1.append("tspan")
                .text((d) => d.icon)
                .attr("dx", (this._orientation.isDocumentRtl ? -1 : 1) * 5);

            const col2 = g
                .append("text")
                .attr("class", "date")
                .attr("text-anchor", "start")
                .attr("dominant-baseline", "middle")
                .attr("x", (d) => this.textX(d))
                .attr("y", (_d, i) => this._text.y + offset + (i === 0 ? 0 : 20));

            col2.append("title").text((d) => d.label);

            const tspan = col2.append("tspan");

            tspan
                .text((d) =>
                    this.truncateDate(
                        tspan,
                        d.label,
                        this._text.width - (d.withImage ? this._image.width : 0) - 25,
                    ),
                )
                .attr("dx", (this._orientation.isDocumentRtl ? -1 : 1) * 15);
        });
    }

    /**
     * Truncates a date value.
     *
     * @param {object} object         The D3 object containing the text value
     * @param {string} date           The date value to truncate
     * @param {number} availableWidth The total available width the text could take
     *
     * @returns {string}
     *
     * @private
     */
    truncateDate(object, date, availableWidth) {
        const fontSize = object.style("font-size");
        const fontWeight = object.style("font-weight");

        let working = date;
        let truncated = false;

        while (
            this.measureText(working, fontSize, fontWeight) > availableWidth &&
            working.length > 1
        ) {
            working = working.slice(0, -1).trim();
            truncated = true;
        }

        if (working[working.length - 1] === ".") {
            working = working.slice(0, -1).trim();
        }

        return truncated ? `${working}…` : working;
    }

    /**
     *
     * @param {object} d
     *
     * @returns {number}
     *
     * @private
     */
    textX(d) {
        const xPos = this._text.x + (d.withImage ? this._image.width : 0);

        // Reverse direction of text elements for RTL layouts
        return this._orientation.isDocumentRtl ? -xPos : xPos;
    }

    /**
     * Measures the given text and return its width depending on the used font (including size and weight).
     *
     * @param {string} text
     * @param {string} fontSize
     * @param {number} fontWeight
     *
     * @returns {number}
     *
     * @private
     */
    measureText(text, fontSize, fontWeight = 400) {
        const fontFamily = this._svg.style("font-family");

        return measureText(text, fontFamily, fontSize, fontWeight);
    }
}
