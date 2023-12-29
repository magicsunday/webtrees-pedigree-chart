/**
 * This file is part of the package magicsunday/webtrees-pedigree-chart.
 *
 * For the full copyright and license information, please read the
 * LICENSE file distributed with this source code.
 */

import measureText from "../chart/text/measure"
import OrientationTopBottom from "../chart/orientation/orientation-topBottom";
import OrientationBottomTop from "../chart/orientation/orientation-bottomTop";

/**
 * The class handles the creation of the tree.
 *
 * @author  Rico Sonntag <mail@ricosonntag.de>
 * @license https://opensource.org/licenses/GPL-3.0 GNU General Public License v3.0
 * @link    https://github.com/magicsunday/webtrees-pedigree-chart/
 */
export default class Date
{
    /**
     * Constructor.
     *
     * @param {Svg}         svg
     * @param {Orientation} orientation
     * @param {Image}       image
     * @param {Text}        text
     */
    constructor(svg, orientation, image, text)
    {
        this._svg         = svg;
        this._orientation = orientation;
        this._image       = image;
        this._text        = text;
    }

    /**
     * Add the individual dates to the given parent element.
     *
     * @param {selection} parent The parent element to which the elements are to be attached
     *
     * @public
     */
    appendDate(parent)
    {
        const table = parent
            .append("g")
            .attr("class", "table");

        // Top/Bottom and Bottom/Top
        if ((this._orientation instanceof OrientationTopBottom)
            || (this._orientation instanceof OrientationBottomTop)
        ) {
            const enter = table.selectAll("text.date")
                .data(d => [{
                    label: d.data.data.timespan,
                    withImage: true
                }])
                .enter()

            const text = enter.append("text")
                .attr("class", "date")
                .attr("text-anchor", "middle")
                .attr("alignment-baseline", "central")
                .attr("y", this._text.y + 75);

            text.append("title")
                .text(d => d.label);

            const tspan = text.append("tspan");

            tspan.text(d => this.truncateDate(tspan, d.label, this._text.width));

            return;
        }

        const offset = 30;

        const enter = table.selectAll("text")
            .data((d) => {
                let data = [];

                if (d.data.data.birth) {
                    data.push({
                        icon: "★", // alternative: ⭐
                        label: d.data.data.birth,
                        birth: true,
                        withImage: d.data.data.thumbnail !== ""
                    });
                }

                if (d.data.data.death) {
                    data.push({
                        icon: "†", // alternative: ⚱️ 🪦 (U+1FAA6)
                        label: d.data.data.death,
                        death: true,
                        withImage: d.data.data.thumbnail !== ""
                    });
                }

                return data;
            })
            .enter();

        enter
            .call((g) => {
                const col1 = g.append("text")
                    .attr("fill", "currentColor")
                    .attr("text-anchor", "middle")
                    .attr("dominant-baseline", "middle")
                    .attr("x", d => this.textX(d))
                    // Minor offset here to better center the icon
                    .attr("y", (d, i) => ((this._text.y + offset) + (i === 0 ? 0 : 21)));

                col1.append("tspan")
                    .text(d => d.icon)
                    .attr("dx", (this._orientation.isDocumentRtl ? -1 : 1) * 5);

                const col2 = g.append("text")
                    .attr("class", "date")
                    .attr("text-anchor", "start")
                    .attr("dominant-baseline", "middle")
                    .attr("x", d => this.textX(d))
                    .attr("y", (d, i) => ((this._text.y + offset) + (i === 0 ? 0 : 20)));

                col2.append("title")
                    .text(d => d.label);

                const tspan = col2.append("tspan");

                tspan.text(d => this.truncateDate(tspan, d.label, this._text.width - (d.withImage ? this._image.width : 0) - 25))
                    .attr("dx", (this._orientation.isDocumentRtl ? -1 : 1) * 15);
            });
    }

    /**
     * Truncates a date value.
     *
     * @param {Object} object         The D3 object containing the text value
     * @param {String} date           The date value to truncate
     * @param {Number} availableWidth The total available width the text could take
     *
     * @return {String}
     *
     * @private
     */
    truncateDate(object, date, availableWidth)
    {
        const fontSize   = object.style("font-size");
        const fontWeight = object.style("font-weight");

        let truncated = false;

        // Repeat removing the last char until the width matches
        while ((this.measureText(date, fontSize, fontWeight) > availableWidth) && (date.length > 1)) {
            // Remove last char
            date      = date.slice(0, -1).trim();
            truncated = true;
        }

        // Remove trailing dot if present
        if (date[date.length - 1] === ".") {
            date = date.slice(0, -1).trim();
        }

        return truncated ? (date + "…") : date;
    }

    /**
     *
     * @param {Object} d
     *
     * @return {Number}
     *
     * @private
     */
    textX(d)
    {
        const xPos = this._text.x + (d.withImage ? this._image.width : 0);

        // Reverse direction of text elements for RTL layouts
        return this._orientation.isDocumentRtl ? -xPos : xPos;
    }

    /**
     * Measures the given text and return its width depending on the used font (including size and weight).
     *
     * @param {String} text
     * @param {String} fontSize
     * @param {Number} fontWeight
     *
     * @returns {Number}
     *
     * @private
     */
    measureText(text, fontSize, fontWeight = 400)
    {
        const fontFamily = this._svg.get().style("font-family");

        return measureText(text, fontFamily, fontSize, fontWeight);
    }
}
