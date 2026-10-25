/**
 * This file is part of the package magicsunday/webtrees-pedigree-chart.
 *
 * For the full copyright and license information, please read the
 * LICENSE file distributed with this source code.
 */

import { truncateNames } from "@magicsunday/webtrees-chart-lib/infra";
import { TextRenderer } from "@magicsunday/webtrees-chart-lib/linked-tree";
import * as d3 from "../d3.js";

/**
 * @import { Selection } from "d3-selection"
 * @import Configuration from "../configuration.js"
 */

/**
 * The kinds of name segments that make up the surname block of a name. Every other
 * kind belongs to the block of the given names.
 *
 * @type {ReadonlySet<string>}
 */
const SURNAME_KINDS = new Set(["surname", "married"]);

/**
 * The class handles the creation of the tree.
 *
 * @author  Rico Sonntag <mail@ricosonntag.de>
 * @license https://opensource.org/licenses/GPL-3.0 GNU General Public License v3.0
 * @link    https://github.com/magicsunday/webtrees-pedigree-chart/
 */
export default class Name extends TextRenderer {
    /**
     * Add the individual names to the given parent element.
     *
     * @param {Selection<any, any, any, any>} parent The parent element to which the elements are to be attached
     *
     * @public
     */
    appendName(parent) {
        const name = parent.append("g").attr("class", "name");
        const isVertical = this._orientation.isVertical;

        const enter = name
            .selectAll("text")
            .data((datum) => [
                {
                    data: datum.data,
                    isRtl: datum.data.data.isNameRtl,
                    isAltRtl: datum.data.data.isAltRtl,
                    // Vertical layouts always arrange the text at the same position
                    // regardless if an image is displayed or not
                    withImage: isVertical || datum.data.data.thumbnail !== "",
                },
            ])
            .enter();

        if (isVertical) {
            // Top/Bottom and Bottom/Top
            this.appendNameLines(enter);
        } else {
            // Left/Right and Right/Left
            this.appendNameLine(enter);
        }

        this.appendAlternativeName(enter, this._text.y + (isVertical ? 40 : 8));
    }

    /**
     * Adds one text line per name block, the given names above the surnames.
     *
     * @param {Selection<any, any, any, any>} enter The entered selection holding the name datum
     *
     * @private
     */
    appendNameLines(enter) {
        const that = this;

        enter.each(function (datum) {
            const element = d3.select(this);
            const nameGroups = that.createNamesData(datum);
            const availableWidth = that.getAvailableWidth(datum);

            nameGroups.forEach((nameGroup, index) => {
                const text = that.createNameText(element, "isRtl", that._text.y - 5 + index * 20);

                that.addNameElements(text, that.truncateNamesData(text, nameGroup, availableWidth));
            });
        });
    }

    /**
     * Adds a single text line holding the whole name.
     *
     * @param {Selection<any, any, any, any>} enter The entered selection holding the name datum
     *
     * @private
     */
    appendNameLine(enter) {
        const text = this.createNameText(enter, "isRtl", this._text.y - 10);

        this.addNameElements(text, (datum) =>
            // The whole name is displayed in one line, so the blocks are merged
            this.truncateNamesData(
                text,
                this.createNamesData(datum).flat(),
                this.getAvailableWidth(datum),
            ),
        );
    }

    /**
     * Adds the alternative name below the name when it is present and enabled.
     *
     * @param {Selection<any, any, any, any>} enter The entered selection holding the name datum
     * @param {number}                        y     The vertical position of the line
     *
     * @private
     */
    appendAlternativeName(enter, y) {
        if (!this._svg._configuration.showAlternativeName) {
            return;
        }

        enter
            .filter((datum) => datum.data.data.alternativeName !== "")
            .call((g) => {
                const text = this.createNameText(g, "isAltRtl", y);

                this.addNameElements(text, (datum) =>
                    this.truncateNamesData(
                        text,
                        this.createAlternativeNamesData(datum),
                        this.getAvailableWidth(datum),
                    ),
                );
            });
    }

    /**
     * Appends an empty name <text> element and positions it for the current layout.
     *
     * @param {Selection<any, any, any, any>} parent The element or entered selection to append to
     * @param {"isRtl"|"isAltRtl"}            rtlKey The datum flag holding the text direction of the line
     * @param {number}                        y      The vertical position of the line
     *
     * @return {Selection<any, any, any, any>}
     *
     * @private
     */
    createNameText(parent, rtlKey, y) {
        const text = parent
            .append("text")
            .attr("class", "wt-chart-box-name")
            .attr("direction", (datum) => (datum[rtlKey] ? "rtl" : "ltr"))
            .attr("text-anchor", (datum) => this.textAnchor(datum[rtlKey]));

        if (this._orientation.isVertical) {
            text.attr("dominant-baseline", "central");
        } else {
            text.attr("x", (datum) => this.textX(datum));
        }

        return text.attr("y", y);
    }

    /**
     * Returns the text anchor of a name line.
     *
     * @param {boolean} isRtl Whether the line is written right to left
     *
     * @return {"start"|"middle"|"end"}
     *
     * @private
     */
    textAnchor(isRtl) {
        if (this._orientation.isVertical) {
            return "middle";
        }

        if (isRtl && this._orientation.isDocumentRtl) {
            return "start";
        }

        if (isRtl || this._orientation.isDocumentRtl) {
            return "end";
        }

        return "start";
    }

    /**
     * Returns the total available width that the text can occupy.
     *
     * @param {NameElementData} datum
     *
     * @return {number}
     *
     * @private
     */
    getAvailableWidth(datum) {
        // The total available width that the text can occupy
        let availableWidth = this._text.width;

        if (datum.withImage && !this._orientation.isVertical) {
            availableWidth -= this._image.width;
        }

        return availableWidth;
    }

    /**
     * Creates a single <tspan> element for each single name and append it to
     * the parent element. The "tspan" element containing the preferred name
     * gets an additional underline style to highlight this one.
     *
     * @param {Selection<any, any, any, any>}   parent The parent element to which the <tspan> elements are to be attached
     * @param {LabelElementData[] | ((arg0: any) => LabelElementData[])} data
     *
     * @private
     */
    addNameElements(parent, data) {
        parent
            .selectAll("tspan")
            .data(data)
            .enter()
            .call((g) => {
                g.append("tspan")
                    .text((datum) => datum.label)
                    // Add some spacing between the elements
                    .attr("dx", (datum, index) => {
                        return index === 0 ? null : `${(datum.isNameRtl ? -1 : 1) * 0.25}em`;
                    })
                    // Highlight the preferred and last name
                    .attr("text-decoration", (datum) => (datum.isPreferred ? "underline" : null))
                    .classed("lastName", (datum) => datum.isLastName);
            });
    }

    /**
     * Groups the name segments into blocks. Consecutive segments of the given-name side
     * (given names and nickname) form one block and consecutive segments of the surname
     * side (surnames and married surname) the next one, in the order of the segments.
     *
     * @param {NameElementData} datum
     *
     * @return {LabelElementData[][]}
     *
     * @private
     */
    createNamesData(datum) {
        /** @type {LabelElementData[][]} */
        const blocks = [];
        let previousIsLastName = null;

        for (const segment of datum.data.data.nameSegments) {
            const isLastName = SURNAME_KINDS.has(segment.kind);

            if (isLastName !== previousIsLastName) {
                blocks.push([]);
                previousIsLastName = isLastName;
            }

            blocks[blocks.length - 1]?.push({
                label: segment.label,
                isPreferred: segment.isPreferred,
                isLastName,
                isNickname: segment.kind === "nickname",
                isNameRtl: datum.data.data.isNameRtl,
            });
        }

        return blocks;
    }

    /**
     * Creates the data array for the names.
     *
     * @param {Selection<any, any, any, any>} parent         The D3 text element the names are attached to
     * @param {LabelElementData[]}            names          The name labels to truncate
     * @param {number}                        availableWidth The total available width the text could take
     *
     * @return {LabelElementData[]}
     *
     * @private
     */
    truncateNamesData(parent, names, availableWidth) {
        const fontSize = parent.style("font-size");
        const fontWeight = parent.style("font-weight");

        return /** @type {LabelElementData[]} */ (
            truncateNames(
                names,
                availableWidth,
                (text) => this.measureText(text, fontSize, fontWeight),
                {
                    strategy: /** @type {Configuration} */ (this._svg._configuration)
                        .nameAbbreviation,
                    // Married-name suffixes like "(Müller)" are supplementary;
                    // drop them entirely instead of truncating to "(.".
                    dropEmptyBracketed: true,
                },
            )
        );
    }

    /**
     * Creates the data array for the alternative name.
     *
     * @param {NameElementData} datum
     *
     * @return {LabelElementData[]}
     *
     * @private
     */
    createAlternativeNamesData(datum) {
        const words = datum.data.data.alternativeName.split(/\s+/);

        /** @type {LabelElementData[]} */
        let names = [];

        // Append the alternative names
        names = names.concat(
            words.map((word) => {
                return {
                    label: word,
                    isPreferred: false,
                    isLastName: false,
                    isNameRtl: datum.data.data.isAltRtl,
                };
            }),
        );

        return names;
    }
}
