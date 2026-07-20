/**
 * This file is part of the package magicsunday/webtrees-pedigree-chart.
 *
 * For the full copyright and license information, please read the
 * LICENSE file distributed with this source code.
 */

import { measureText, truncateNames } from "@magicsunday/webtrees-chart-lib";
import * as d3 from "../d3.js";

/**
 * @import { Selection } from "d3-selection"
 * @import { Orientation } from "@magicsunday/webtrees-chart-lib"
 * @import Svg from "../chart/svg.js"
 * @import ImageBox from "../chart/box/image.js"
 * @import TextBox from "../chart/box/text.js"
 */

/**
 * Locates a surname inside the assembled name, skipping every occurrence that
 * starts where a given name starts or that an earlier surname already claimed.
 *
 * The search restarts at zero for every surname on purpose. A single offset that
 * only moves forward ties the result to the order of the `lastNames` array: for
 * "Anna Meier Schmidt" with `["Schmidt", "Meier"]`, accepting "Schmidt" at 11
 * pushes the offset past "Meier" at 5 and loses it. Claiming positions instead
 * keeps a repeated token ("Schmidt Schmidt") on two separate entries without
 * depending on that order.
 *
 * @param {string}      fullName   The assembled name to search
 * @param {string}      lastName   The surname to locate; must not be empty
 * @param {Map}         firstnames Given-name entries keyed by start position
 * @param {Set<number>} taken      Positions already claimed by earlier surnames
 *
 * @return {number} The start position, or -1 when no free occurrence exists
 */
function locateSurname(fullName, lastName, firstnames, taken) {
    let searchFrom = 0;

    while (searchFrom <= fullName.length) {
        const pos = fullName.indexOf(lastName, searchFrom);

        if (pos === -1 || (!taken.has(pos) && !firstnames.has(pos))) {
            return pos;
        }

        searchFrom = pos + 1;
    }

    return -1;
}

/**
 * The class handles the creation of the tree.
 *
 * @author  Rico Sonntag <mail@ricosonntag.de>
 * @license https://opensource.org/licenses/GPL-3.0 GNU General Public License v3.0
 * @link    https://github.com/magicsunday/webtrees-pedigree-chart/
 */
export default class Name {
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
     * Add the individual names to the given parent element.
     *
     * @param {Selection<any, any, any, any>} parent The parent element to which the elements are to be attached
     *
     * @public
     */
    appendName(parent) {
        const name = parent.append("g").attr("class", "name");

        // Top/Bottom and Bottom/Top
        if (this._orientation.isVertical) {
            const that = this;

            const enter = name
                .selectAll("text")
                .data((datum) => [
                    {
                        data: datum.data,
                        isRtl: datum.data.data.isNameRtl,
                        isAltRtl: datum.data.data.isAltRtl,
                        // Always arrange the text at the same position regardless if an image is displayed or not
                        withImage: true,
                    },
                ])
                .enter();

            enter.each(function (datum) {
                const element = d3.select(this);
                const nameGroups = that.createNamesData(datum);
                const availableWidth = that.getAvailableWidth(datum);

                nameGroups.forEach((nameGroup, index) => {
                    const text = element
                        .append("text")
                        .attr("class", "wt-chart-box-name")
                        .attr("direction", (datum) => (datum.isRtl ? "rtl" : "ltr"))
                        .attr("text-anchor", "middle")
                        .attr("alignment-baseline", "central")
                        .attr("y", that._text.y - 5 + index * 20);

                    that.addNameElements(
                        text,
                        that.truncateNamesData(text, nameGroup, availableWidth),
                    );
                });
            });

            // Add alternative name if present
            if (this._svg._configuration.showAlternativeName) {
                enter
                    .filter((datum) => datum.data.data.alternativeName !== "")
                    .call((g) => {
                        const text = g
                            .append("text")
                            .classed("wt-chart-box-name-alt", true)
                            .attr("class", "wt-chart-box-name")
                            .attr("direction", (datum) => (datum.isAltRtl ? "rtl" : "ltr"))
                            .attr("text-anchor", "middle")
                            .attr("alignment-baseline", "central")
                            .attr("y", this._text.y + 40);

                        this.addNameElements(text, (datum) =>
                            this.truncateNamesData(
                                text,
                                this.createAlternativeNamesData(datum),
                                this.getAvailableWidth(datum),
                            ),
                        );
                    });
            }

            // Left/Right and Right/Left
        } else {
            const enter = name
                .selectAll("text")
                .data((datum) => [
                    {
                        data: datum.data,
                        isRtl: datum.data.data.isNameRtl,
                        isAltRtl: datum.data.data.isAltRtl,
                        withImage: datum.data.data.thumbnail !== "",
                    },
                ])
                .enter();

            enter.call((g) => {
                const text = g
                    .append("text")
                    .attr("class", "wt-chart-box-name")
                    .attr("direction", (datum) => (datum.isRtl ? "rtl" : "ltr"))
                    .attr("text-anchor", (datum) => {
                        if (datum.isRtl && this._orientation.isDocumentRtl) {
                            return "start";
                        }

                        if (datum.isRtl || this._orientation.isDocumentRtl) {
                            return "end";
                        }

                        return "start";
                    })
                    .attr("x", (datum) => this.textX(datum))
                    .attr("y", this._text.y - 10);

                this.addNameElements(text, (datum) => {
                    const [first, ...last] = this.createNamesData(datum);

                    // Merge the firstname and lastname groups, as we display the whole name in one line
                    const combined = [].concat(
                        first,
                        typeof last[0] === "undefined" ? [] : last[0],
                    );

                    return this.truncateNamesData(text, combined, this.getAvailableWidth(datum));
                });
            });

            // Add alternative name if present
            if (this._svg._configuration.showAlternativeName) {
                enter
                    .filter((datum) => datum.data.data.alternativeName !== "")
                    .call((g) => {
                        const text = g
                            .append("text")
                            .classed("wt-chart-box-name-alt", true)
                            .attr("class", "wt-chart-box-name")
                            .attr("direction", (datum) => (datum.isAltRtl ? "rtl" : "ltr"))
                            .attr("text-anchor", (datum) => {
                                if (datum.isAltRtl && this._orientation.isDocumentRtl) {
                                    return "start";
                                }

                                if (datum.isAltRtl || this._orientation.isDocumentRtl) {
                                    return "end";
                                }

                                return "start";
                            })
                            .attr("x", (datum) => this.textX(datum))
                            .attr("y", this._text.y + 8);

                        this.addNameElements(text, (datum) =>
                            this.truncateNamesData(
                                text,
                                this.createAlternativeNamesData(datum),
                                this.getAvailableWidth(datum),
                            ),
                        );
                    });
            }
        }
    }

    /**
     * Returns the total available width that the text can occupy.
     *
     * @param {NameElementData} datum
     *
     * @returns {number}
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
     * Creates the data array for the names in top/bottom layout.
     *
     * @param {NameElementData} datum
     *
     * @return {LabelElementData[][]}
     *
     * @private
     */
    createNamesData(datum) {
        // Keyed by the smallest character position of the group, so the groups
        // come out in the order they occur in the assembled name.
        /** @type {Object<number, LabelElementData[]>} */
        const names = {};
        let minPosFirstnames = Number.MAX_SAFE_INTEGER;
        let minPosLastnames = Number.MAX_SAFE_INTEGER;

        let firstnameOffset = 0;
        const firstnameMap = new Map();

        // Iterate over the individual name components and determine their position in the overall
        // name and insert the component at the corresponding position in the result object.
        for (const firstName of datum.data.data.firstNames) {
            // Mirrors the surname guard below. `indexOf("", offset)` returns the
            // offset itself, so an empty given name registers a zero-length entry
            // at whatever position the search had reached. That entry renders as
            // an empty label and, worse, occupies a position the surname search
            // then treats as taken.
            if (!firstName) {
                continue;
            }

            const pos = datum.data.data.name.indexOf(firstName, firstnameOffset);

            if (pos !== -1) {
                firstnameOffset = pos + firstName.length;

                if (pos < minPosFirstnames) {
                    minPosFirstnames = pos;
                }

                firstnameMap.set(pos, {
                    label: firstName,
                    isPreferred: firstName === datum.data.data.preferredName,
                    isLastName: false,
                    isNameRtl: datum.data.data.isNameRtl,
                });
            }
        }

        // Insert the optional nickname (e.g. "Chalky") into the first-names
        // group when getShowNicknames is enabled and the GEDCOM has a NICK.
        // Adding it to the firstname map keeps it inside the same slot as the
        // given names; position-keyed iteration places it after the given names
        // before the surname slot starts.
        const nickname = datum.data.data.nickname;

        if (nickname && nickname !== "") {
            const nickQuoted = `"${nickname}"`;
            const nickPos = datum.data.data.name.indexOf(nickQuoted);

            if (nickPos !== -1) {
                firstnameMap.set(nickPos, {
                    label: nickQuoted,
                    isPreferred: false,
                    isLastName: false,
                    isNickname: true,
                    isNameRtl: datum.data.data.isNameRtl,
                });
            }
        }

        names[minPosFirstnames] = [...firstnameMap].map(([, value]) => value);

        const lastnameMap = new Map();
        const takenPositions = new Set();

        for (const lastName of datum.data.data.lastNames) {
            // An empty surname would never terminate the search below:
            // `indexOf("", offset)` returns `offset` itself, so the skip-forward
            // step advances by a match length of zero and the position never
            // moves. NameProcessor::splitAndCleanName() drops empty parts today,
            // but that guarantee lives in a separate package, so guard here.
            if (!lastName) {
                continue;
            }

            const pos = locateSurname(datum.data.data.name, lastName, firstnameMap, takenPositions);

            if (pos !== -1) {
                takenPositions.add(pos);
            }

            if (pos !== -1) {
                if (pos < minPosLastnames) {
                    minPosLastnames = pos;
                }

                lastnameMap.set(pos, {
                    label: lastName,
                    isPreferred: false,
                    isLastName: true,
                    isNameRtl: datum.data.data.isNameRtl,
                });
            }
        }

        names[minPosLastnames] = [...lastnameMap].map(([, value]) => value);

        // Extract the values (keys don't matter anymore)
        return Object.values(names);
    }

    /**
     * Creates the data array for the names.
     *
     * @param {object}             parent
     * @param {LabelElementData[]} names
     * @param {number}             availableWidth
     *
     * @returns {LabelElementData[]}
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
                    strategy: this._svg._configuration.nameAbbreviation,
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
     * @returns {LabelElementData[]}
     *
     * @private
     */
    createAlternativeNamesData(datum) {
        const words = datum.data.data.alternativeName.split(/\s+/);

        /** @var {LabelElementData[]} names */
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
     * Measures the given text and return its width depending on the used font
     * (including size and weight).
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
