/**
 * This file is part of the package magicsunday/webtrees-pedigree-chart.
 *
 * For the full copyright and license information, please read the
 * LICENSE file distributed with this source code.
 */

import { measureText, truncateNames } from "@magicsunday/webtrees-chart-lib";
import * as d3 from "../d3.js";
import { LAYOUT_ALTNAME_CENTER_GAP } from "../constants.js";

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

            const showAltName = this._svg._configuration.showAlternativeName;

            enter.each(function (datum) {
                const element = d3.select(this);
                // createNamesData is the most expensive name-side
                // operation per individual; compute once and reuse for
                // surname rows AND the alt-name y-offset (the alt-name
                // sits relative to the surname y, which depends on the
                // group count).
                const nameGroups = that.createNamesData(datum);
                const availableWidth = that.getAvailableWidth(datum);

                nameGroups.forEach((nameGroup, index) => {
                    const text = element
                        .append("text")
                        .attr("class", "wt-chart-box-name")
                        .attr("direction", (datum) => (datum.isRtl ? "rtl" : "ltr"))
                        .attr("text-anchor", "middle")
                        .attr("dominant-baseline", "middle")
                        .attr("y", that._text.y - 10 + index * 20);

                    that.addNameElements(
                        text,
                        that.truncateNamesData(text, nameGroup, availableWidth),
                    );
                });

                // Alt-name sits LAYOUT_ALTNAME_CENTER_GAP below the
                // surname (which itself sits at text.y - 10 +
                // (groups-1)*20). Reuses the nameGroups count from
                // above instead of re-running createNamesData.
                if (showAltName && datum.data.data.alternativeName !== "") {
                    const altY =
                        that._text.y +
                        (nameGroups.length - 1) * 20 -
                        10 +
                        LAYOUT_ALTNAME_CENTER_GAP;
                    const altText = element
                        .append("text")
                        .attr("class", "wt-chart-box-name wt-chart-box-name-alt")
                        .attr("direction", datum.isAltRtl ? "rtl" : "ltr")
                        .attr("text-anchor", "middle")
                        .attr("dominant-baseline", "middle")
                        .attr("y", altY);

                    that.addNameElements(
                        altText,
                        that.truncateNamesData(
                            altText,
                            that.createAlternativeNamesData(datum),
                            availableWidth,
                        ),
                    );
                }
            });

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
                const mainAnchor = (datum) => {
                    if (datum.isRtl && this._orientation.isDocumentRtl) {
                        return "start";
                    }
                    if (datum.isRtl || this._orientation.isDocumentRtl) {
                        return "end";
                    }
                    return "start";
                };

                const text = g
                    .append("text")
                    .attr("class", "wt-chart-box-name")
                    .attr("direction", (datum) => (datum.isRtl ? "rtl" : "ltr"))
                    .attr("text-anchor", mainAnchor)
                    // For end-anchored RTL names, x must be the right
                    // edge of the text column so the text right-aligns
                    // against the box edge — native RTL convention,
                    // matching webtrees core's chart-box rendering.
                    .attr("x", (datum) =>
                        mainAnchor(datum) === "end" ? this.textRightEdge(datum) : this.textX(datum),
                    )
                    // Central baseline so the same baseline-to-baseline
                    // gaps used in vertical (20 px name-grid, 25 px
                    // name → vital) apply here. The name centres
                    // 12.5 px below the box's image-padding line —
                    // i.e., 20 px below the box top (= image-padding
                    // 7.5 + 12.5) — leaving a comfortable top gap
                    // before the date block sits 25 px further down.
                    .attr("dominant-baseline", "middle")
                    .attr("y", this._text.y + 12.5);

                this.addNameElements(text, (datum) => {
                    // Merge all name groups (firstnames, optional nickname, lastnames)
                    // into one inline list — horizontal layouts show the whole
                    // name on a single line.
                    const combined = this.createNamesData(datum).flat();

                    return this.truncateNamesData(text, combined, this.getAvailableWidth(datum));
                });
            });

            // Add alternative name if present
            if (this._svg._configuration.showAlternativeName) {
                enter
                    .filter((datum) => datum.data.data.alternativeName !== "")
                    .call((g) => {
                        const altAnchor = (datum) => {
                            if (datum.isAltRtl && this._orientation.isDocumentRtl) {
                                return "start";
                            }
                            if (datum.isAltRtl || this._orientation.isDocumentRtl) {
                                return "end";
                            }
                            return "start";
                        };

                        const text = g
                            .append("text")
                            .attr("class", "wt-chart-box-name wt-chart-box-name-alt")
                            .attr("direction", (datum) => (datum.isAltRtl ? "rtl" : "ltr"))
                            .attr("text-anchor", altAnchor)
                            // For end-anchored RTL alt-names, the x must
                            // be the right edge of the text column —
                            // native RTL convention.
                            .attr("x", (datum) =>
                                altAnchor(datum) === "end"
                                    ? this.textRightEdge(datum)
                                    : this.textX(datum),
                            )
                            // Central baseline, centred between the main
                            // name and the vital block — same rhythm as
                            // the vertical layout's surname → alt gap.
                            .attr("dominant-baseline", "middle")
                            .attr("y", this._text.y + 12.5 + LAYOUT_ALTNAME_CENTER_GAP);

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
     * Creates a single <tspan> element for each single name and append it to the
     * parent element. The "tspan" element containing the preferred name gets an
     * additional underline style to highlight this one.
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
                    .classed("lastName", (datum) => datum.isLastName)
                    .classed("nickname", (datum) => datum.isNickname);
            });
    }

    /**
     * Creates the data array for the names in top/bottom layout.
     *
     * @param {NameElementData} datum
     *
     * @returns {LabelElementData[][]}
     *
     * @private
     */
    createNamesData(datum) {
        /** @var {LabelElementData[][]} names */
        const names = {};
        /** @var {LabelElementData[]} firstnames */
        const _firstnames = {};
        /** @var {LabelElementData[]} lastnames */
        const _lastnames = {};
        let minPosFirstnames = Number.MAX_SAFE_INTEGER;
        let minPosLastnames = Number.MAX_SAFE_INTEGER;

        let firstnameOffset = 0;
        const firstnameMap = new Map();

        // Iterate over the individual name components and determine their position in the overall
        // name and insert the component at the corresponding position in the result object.
        for (const i in datum.data.data.firstNames) {
            const pos = datum.data.data.name.indexOf(
                datum.data.data.firstNames[i],
                firstnameOffset,
            );

            if (pos !== -1) {
                firstnameOffset = pos + datum.data.data.firstNames[i].length;

                if (pos < minPosFirstnames) {
                    minPosFirstnames = pos;
                }

                firstnameMap.set(pos, {
                    label: datum.data.data.firstNames[i],
                    isPreferred: datum.data.data.firstNames[i] === datum.data.data.preferredName,
                    isLastName: false,
                    isNameRtl: datum.data.data.isNameRtl,
                });
            }
        }

        names[minPosFirstnames] = [...firstnameMap].map(([, value]) => value);

        // The optional nickname (e.g. "Chalky") becomes its own group when
        // getShowNicknames is enabled and the GEDCOM has a NICK. Vertical
        // layouts render this group on a dedicated middle line between the
        // given names and the surname; horizontal layouts merge the three
        // groups back into one inline string with italic styling on the
        // nickname tspan.
        const nickname = datum.data.data.nickname;

        if (nickname && nickname !== "") {
            const nickQuoted = `"${nickname}"`;
            const nickPos = datum.data.data.name.indexOf(nickQuoted);

            if (nickPos !== -1) {
                names[nickPos] = [
                    {
                        label: nickQuoted,
                        isPreferred: false,
                        isLastName: false,
                        isNickname: true,
                        isNameRtl: datum.data.data.isNameRtl,
                    },
                ];
            }
        }

        let lastnameOffset = 0;
        const lastnameMap = new Map();

        for (const i in datum.data.data.lastNames) {
            let pos;

            // Check if last name already exists in first names list, in case first name equals last name
            do {
                pos = datum.data.data.name.indexOf(datum.data.data.lastNames[i], lastnameOffset);

                if (pos !== -1 && firstnameMap.has(pos)) {
                    lastnameOffset += pos + datum.data.data.lastNames[i].length;
                }
            } while (pos !== -1 && firstnameMap.has(pos));

            if (pos !== -1) {
                lastnameOffset = pos;

                if (pos < minPosLastnames) {
                    minPosLastnames = pos;
                }

                lastnameMap.set(pos, {
                    label: datum.data.data.lastNames[i],
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
                { strategy: this._svg._configuration.nameAbbreviation },
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
     * Right edge of the text column. Used as the anchor x for end-aligned
     * text such as RTL names rendered in an LTR document, so the text
     * right-aligns against the box edge (native RTL convention) instead
     * of overflowing the image area.
     *
     * @param {object} _d Unused, kept for parity with textX
     *
     * @returns {number}
     *
     * @private
     */
    textRightEdge(_d) {
        const xPos = this._text.x + this._text.width;
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
