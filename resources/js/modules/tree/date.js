/**
 * This file is part of the package magicsunday/webtrees-pedigree-chart.
 *
 * For the full copyright and license information, please read the
 * LICENSE file distributed with this source code.
 */

import { measureText } from "@magicsunday/webtrees-chart-lib";
import * as d3 from "../d3.js";
import { LAYOUT_FACT_ROW_HEIGHT, LAYOUT_VERTICAL_NODE_HEIGHT_OFFSET } from "../constants.js";

/**
 * @import { Selection } from "d3-selection"
 * @import { Orientation } from "@magicsunday/webtrees-chart-lib"
 * @import Svg from "../chart/svg.js"
 * @import ImageBox from "../chart/box/image.js"
 * @import TextBox from "../chart/box/text.js"
 */

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
     * @param {ImageBox}    image
     * @param {TextBox}     text
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
     * @param {Selection<any, any, any, any>} parent The parent element to which the elements are to be attached
     *
     * @public
     */
    appendDate(parent) {
        const table = parent.append("g");

        const showAdditionalFacts =
            this._svg._configuration.showAdditionalFacts &&
            Array.isArray(this._svg._configuration.factSlots) &&
            this._svg._configuration.factSlots.length > 0;

        // Top/Bottom and Bottom/Top
        if (this._orientation.isVertical) {
            if (showAdditionalFacts) {
                this.appendFactRows(table);
                return;
            }

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

        // Horizontal layouts: when additional facts are enabled, render one
        // row per fact slot (BIRT → optional tags → DEAT) next to the image,
        // with placeholder rows reserved even when the individual has no
        // matching event so all boxes stay aligned.
        if (showAdditionalFacts) {
            this.appendHorizontalFactRows(table);
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
     * Renders one row per fact slot for the horizontal layouts, stacked
     * next to the image (to its right in LTR). Icon column shows ★/† for
     * BIRT/DEAT slots; empty for others. Text column shows date + place
     * or label + value.
     *
     * @param {Selection} parent
     *
     * @private
     */
    appendHorizontalFactRows(parent) {
        const factSlots = this._svg._configuration.factSlots;
        const baseY = this._text.y + 30;
        const iconDx = (this._orientation.isDocumentRtl ? -1 : 1) * 5;
        const textDx = (this._orientation.isDocumentRtl ? -1 : 1) * 15;

        // BIRT and DEAT stack directly under the name; optional facts
        // appear below with an extra gap to separate the date block from
        // additional content.
        const DEAT_INDEX = 1;
        const GAP = 6;
        const imageWidth = this._image.width;
        const baseTextWidth = this._text.width;
        const self = this;

        factSlots.forEach((slotTag, index) => {
            const y = baseY + index * LAYOUT_FACT_ROW_HEIGHT + (index > DEAT_INDEX ? GAP : 0);

            // Sub-selection of persons who actually have a fact at this
            // slot. Missing slots produce no text node at all.
            const slot = parent.filter(
                (d) => Array.isArray(d.data.data.facts) && d.data.data.facts[index] !== null,
            );

            // Icon column (★ / † / ⚭). Only for BIRT/DEAT/MARR, other tags
            // get their label as prefix instead.
            const slotIcon =
                slotTag === "BIRT"
                    ? "★"
                    : slotTag === "DEAT"
                      ? "†"
                      : slotTag === "MARR"
                        ? "⚭"
                        : null;
            if (slotIcon !== null) {
                slot.append("text")
                    .attr("class", "fact-icon")
                    .attr("fill", "currentColor")
                    .attr("text-anchor", "middle")
                    .attr("dominant-baseline", "middle")
                    .attr("x", (d) => self.textX({ withImage: d.data.data.thumbnail !== "" }))
                    .attr("y", y)
                    .append("tspan")
                    .attr("dx", iconDx)
                    .text(slotIcon);
            }

            // Text column with per-person truncation.
            slot.append("text")
                .attr("class", "fact")
                .attr("text-anchor", "start")
                .attr("dominant-baseline", "middle")
                .attr("x", (d) => self.textX({ withImage: d.data.data.thumbnail !== "" }))
                .attr("y", y)
                .each(function (d) {
                    const view = d.data.data.facts[index];
                    const formatted = self.formatFactText(slotTag, view);
                    const available =
                        baseTextWidth - (d.data.data.thumbnail === "" ? 0 : imageWidth) - 25;
                    const textSel = d3.select(this);

                    textSel.append("title").text(formatted);
                    const tspan = textSel.append("tspan").attr("dx", textDx);
                    tspan.text(self.truncateDate(tspan, formatted, available));
                });
        });
    }

    /**
     * Formats a fact view for horizontal display. Like formatFactRow but
     * without the leading icon (icon is rendered in a separate column).
     *
     * @param {string}      slotTag
     * @param {object|null} view
     *
     * @returns {string}
     *
     * @private
     */
    formatFactText(slotTag, view) {
        if (view === null || view === undefined) {
            return "";
        }

        if (slotTag === "BIRT" || slotTag === "DEAT" || slotTag === "MARR") {
            const parts = [];
            if (view.date) parts.push(view.date);
            if (view.place) parts.push(view.place);
            return parts.join(" ");
        }

        const content = view.value || view.place || view.date;
        if (!content) {
            return "";
        }

        return `${view.label}: ${content}`;
    }

    /**
     * Renders one text row per fact slot for the vertical layouts. Each row
     * is formatted based on the slot's tag:
     *   - BIRT → "★ {date} {place}"
     *   - DEAT → "† {date} {place}"
     *   - other → "{label}: {value-or-place-or-date}"
     *
     * Empty slots still reserve vertical space so all boxes stay the same
     * height regardless of how many facts each individual has recorded.
     *
     * @param {Selection} parent
     *
     * @private
     */
    appendFactRows(parent) {
        const factSlots = this._svg._configuration.factSlots;
        const baseY =
            this._text.y +
            45 +
            (this._svg._configuration.showAlternativeName ? LAYOUT_VERTICAL_NODE_HEIGHT_OFFSET : 0);
        const DEAT_INDEX = 1;
        const GAP = 6;
        const availableWidth = this._text.width;
        const self = this;

        factSlots.forEach((slotTag, index) => {
            const y = baseY + index * LAYOUT_FACT_ROW_HEIGHT + (index > DEAT_INDEX ? GAP : 0);

            parent
                .filter(
                    (d) => Array.isArray(d.data.data.facts) && d.data.data.facts[index] !== null,
                )
                .append("text")
                .attr("class", "fact")
                .attr("text-anchor", "middle")
                .attr("alignment-baseline", "central")
                .attr("y", y)
                .each(function (d) {
                    const view = d.data.data.facts[index];
                    const formatted = self.formatFactRow(slotTag, view);
                    const textSel = d3.select(this);

                    textSel.append("title").text(formatted);
                    const tspan = textSel.append("tspan");
                    tspan.text(self.truncateDate(tspan, formatted, availableWidth));
                });
        });
    }

    /**
     * Formats one fact view for display in a box row. Returns an empty
     * string when the individual has no matching event — the row is
     * still emitted so the slot's vertical position stays consistent.
     *
     * @param {string}      slotTag
     * @param {object|null} view
     *
     * @returns {string}
     *
     * @private
     */
    formatFactRow(slotTag, view) {
        if (view === null || view === undefined) {
            return "";
        }

        if (slotTag === "BIRT") {
            return this.joinIconDatePlace("★", view.date, view.place);
        }

        if (slotTag === "DEAT") {
            return this.joinIconDatePlace("†", view.date, view.place);
        }

        if (slotTag === "MARR") {
            return this.joinIconDatePlace("⚭", view.date, view.place);
        }

        const content = view.value || view.place || view.date;
        if (!content) {
            return "";
        }

        return `${view.label}: ${content}`;
    }

    /**
     * @param {string} icon
     * @param {string} date
     * @param {string} place
     *
     * @returns {string}
     *
     * @private
     */
    joinIconDatePlace(icon, date, place) {
        const parts = [icon];
        if (date) parts.push(date);
        if (place) parts.push(place);

        return parts.length > 1 ? parts.join(" ") : "";
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
