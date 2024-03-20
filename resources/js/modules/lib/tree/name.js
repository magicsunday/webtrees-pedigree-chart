/**
 * This file is part of the package magicsunday/webtrees-pedigree-chart.
 *
 * For the full copyright and license information, please read the
 * LICENSE file distributed with this source code.
 */

import measureText from "../chart/text/measure"
import OrientationTopBottom from "../chart/orientation/orientation-topBottom";
import OrientationBottomTop from "../chart/orientation/orientation-bottomTop";
import OrientationLeftRight from "../chart/orientation/orientation-leftRight";
import OrientationRightLeft from "../chart/orientation/orientation-rightLeft";
import * as d3 from "../d3.js";

/**
 * The class handles the creation of the tree.
 *
 * @author  Rico Sonntag <mail@ricosonntag.de>
 * @license https://opensource.org/licenses/GPL-3.0 GNU General Public License v3.0
 * @link    https://github.com/magicsunday/webtrees-pedigree-chart/
 */
export default class Name
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
     * Add the individual names to the given parent element.
     *
     * @param {selection} parent The parent element to which the elements are to be attached
     *
     * @public
     */
    appendName(parent)
    {
        const name = parent
            .append("g")
            .attr("class", "name");

        // Top/Bottom and Bottom/Top
        if ((this._orientation instanceof OrientationTopBottom)
            || (this._orientation instanceof OrientationBottomTop)
        ) {
            const that = this;

            const enter = name.selectAll("text")
                .data(datum => [
                    {
                        data: datum.data,
                        isRtl: datum.data.data.isNameRtl,
                        isAltRtl: datum.data.data.isAltRtl,
                        // Always arrange the text at the same position regardless if an image is displayed or not
                        withImage: true
                    }
                ])
                .enter();

            enter
                .each(function (d) {
                    const element = d3.select(this);
                    const nameGroups = that.createNamesData(d);

                    nameGroups.forEach((nameGroup, index) => {
                        const text = element.append("text")
                            .attr("class", "wt-chart-box-name")
                            .attr("text-anchor", "middle")
                            .attr("direction", d => d.isRtl ? "rtl" : "ltr")
                            .attr("alignment-baseline", "central")
                            .attr("y", that._text.y - 5 + (index * 20));

                        that.addNameElements(
                            text,
                            that.truncateNamesData(
                                text,
                                nameGroup,
                                d.withImage
                            )
                        );
                    });
                });

            // Add alternative name if present
            if (this._svg._configuration.showAlternativeName) {
                enter
                    .filter(d => d.data.data.alternativeName !== "")
                    .call((g) => {
                        const text = g.append("text")
                            .attr("class", "wt-chart-box-name")
                            .attr("text-anchor", "middle")
                            .attr("direction", d => d.isAltRtl ? "rtl" : "ltr")
                            .attr("alignment-baseline", "central")
                            .attr("y", this._text.y + 40)
                            .classed("wt-chart-box-name-alt", true);

                        this.addNameElements(
                            text,
                            datum => this.createAlternativeNamesData(text, datum)
                        );
                    });
            }

            // Left/Right and Right/Left
        } else {
            const enter = name.selectAll("text")
                .data(datum => [
                    {
                        data: datum.data,
                        isRtl: datum.data.data.isNameRtl,
                        isAltRtl: datum.data.data.isAltRtl,
                        withImage: datum.data.data.thumbnail !== ""
                    }
                ])
                .enter();

            enter
                .call((g) => {
                    const text = g.append("text")
                        .attr("class", "wt-chart-box-name")
                        .attr("text-anchor", (d) => {
                            if (d.isRtl && this._orientation.isDocumentRtl) {
                                return "start";
                            }

                            if (d.isRtl || this._orientation.isDocumentRtl) {
                                return "end";
                            }

                            return "start";
                        })
                        .attr("direction", d => d.isRtl ? "rtl" : "ltr")
                        .attr("x", d => this.textX(d))
                        .attr("y", this._text.y - 10);

                    this.addNameElements(
                        text,
                        (datum) => {
                            const nameGroups = this.createNamesData(datum);

                            return this.truncateNamesData(
                                text,
                                // Merge the firstname and lastname groups together,
                                // as we display the whole name in one line
                                [
                                    ...nameGroups[0],
                                    ...nameGroups[1],
                                ],
                                datum.withImage
                            )
                        }
                    );
                });

            // Add alternative name if present
            if (this._svg._configuration.showAlternativeName) {
                enter
                    .filter(datum => datum.data.data.alternativeName !== "")
                    .call((g) => {
                        const text = g.append("text")
                            .attr("class", "wt-chart-box-name")
                            .attr("text-anchor", (d) => {
                                if (d.isAltRtl && this._orientation.isDocumentRtl) {
                                    return "start";
                                }

                                if (d.isAltRtl || this._orientation.isDocumentRtl) {
                                    return "end";
                                }

                                return "start";
                            })
                            .attr("direction", d => d.isAltRtl ? "rtl" : "ltr")
                            .attr("x", d => this.textX(d))
                            .attr("y", this._text.y + 8)
                            .classed("wt-chart-box-name-alt", true);

                        this.addNameElements(
                            text,
                            datum => this.createAlternativeNamesData(text, datum)
                        );
                    });
            }
        }
    }

    /**
     * Creates a single <tspan> element for each single name and append it to the
     * parent element. The "tspan" element containing the preferred name gets an
     * additional underline style to highlight this one.
     *
     * @param {selection}                       parent The parent element to which the <tspan> elements are to be attached
     * @param {function(*): LabelElementData[]} data
     *
     * @private
     */
    addNameElements(parent, data)
    {
        parent.selectAll("tspan")
            .data(data)
            .enter()
            .call((g) => {
                g.append("tspan")
                    .text(datum => datum.label)
                    // Add some spacing between the elements
                    .attr("dx", (datum, index) => {
                        return index !== 0 ? ((datum.isNameRtl ? -1 : 1) * 0.25) + "em" : null;
                    })
                    // Highlight the preferred and last name
                    .classed("preferred", datum => datum.isPreferred)
                    .classed("lastName", datum => datum.isLastName);
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
    createNamesData(datum)
    {
        /** @var {LabelElementData[][]} names */
        let names = {};
        /** @var {LabelElementData[]} firstnames */
        let firstnames = {};
        /** @var {LabelElementData[]} lastnames */
        let lastnames = {};
        let minPosFirstnames = Number.MAX_SAFE_INTEGER;
        let minPosLastnames = Number.MAX_SAFE_INTEGER;

        // Iterate over the individual name components and determine their position in the overall
        // name and insert the component at the corresponding position in the result object.
        for (let i in datum.data.data.firstNames) {
            const pos = datum.data.data.name.indexOf(datum.data.data.firstNames[i]);

            if (pos !== -1) {
                if (pos < minPosFirstnames) {
                    minPosFirstnames = pos;
                }

                firstnames[pos] = {
                    label: datum.data.data.firstNames[i],
                    isPreferred: datum.data.data.firstNames[i] === datum.data.data.preferredName,
                    isLastName: false,
                    isNameRtl: datum.data.data.isNameRtl
                };
            }
        }

        names[minPosFirstnames] = Object.values(firstnames);

        for (let i in datum.data.data.lastNames) {
            const pos = datum.data.data.name.indexOf(datum.data.data.lastNames[i]);

            if (pos !== -1) {
                if (pos < minPosLastnames) {
                    minPosLastnames = pos;
                }

                lastnames[pos] = {
                    label: datum.data.data.lastNames[i],
                    isPreferred: false,
                    isLastName: true,
                    isNameRtl: datum.data.data.isNameRtl
                };
            }
        }

        names[minPosLastnames] = Object.values(lastnames);

        // Extract the values (keys doesn't matter anymore)
        return Object.values(names);
    }

    /**
     * Creates the data array for the names.
     *
     * @param {Object}             parent
     * @param {LabelElementData[]} names
     * @param {Boolean}            withImage
     *
     * @return {LabelElementData[]}
     *
     * @private
     */
    truncateNamesData(parent, names, withImage)
    {
        const fontSize   = parent.style("font-size");
        const fontWeight = parent.style("font-weight");

        // The total available width that the text can occupy
        let availableWidth = this._text.width;

        if (withImage) {
            if ((this._orientation instanceof OrientationLeftRight)
                || (this._orientation instanceof OrientationRightLeft)
            ) {
                availableWidth -= this._image.width;
            }
        }

        return this.truncateNames(names, fontSize, fontWeight, availableWidth);
    }

    /**
     * Creates the data array for the alternative name.
     *
     * @param {Object}          parent
     * @param {NameElementData} datum
     *
     * @return {LabelElementData[]}
     *
     * @private
     */
    createAlternativeNamesData(parent, datum)
    {
        let words = datum.data.data.alternativeName.split(/\s+/);

        /** @var {LabelElementData[]} names */
        let names = [];

        // Append the alternative names
        names = names.concat(
            words.map((word) => {
                return {
                    label: word,
                    isPreferred: false,
                    isLastName: false,
                    isNameRtl: datum.data.data.isAltRtl
                }
            })
        );

        const fontSize   = parent.style("font-size");
        const fontWeight = parent.style("font-weight");

        // The total available width that the text can occupy
        let availableWidth = this._text.width;

        if (datum.withImage) {
            if ((this._orientation instanceof OrientationLeftRight)
                || (this._orientation instanceof OrientationRightLeft)
            ) {
                availableWidth -= this._image.width;
            }
        }

        return this.truncateNames(names, fontSize, fontWeight, availableWidth);
    }

    /**
     * Truncates the list of names.
     *
     * @param {LabelElementData[]} names          The names array
     * @param {String}             fontSize       The font size
     * @param {Number}             fontWeight     The font weight
     * @param {Number}             availableWidth The available width
     *
     * @return {LabelElementData[]}
     *
     * @private
     */
    truncateNames(names, fontSize, fontWeight, availableWidth)
    {
        let text = names.map(item => item.label).join(" ");

        return names
            // Start truncating from the last element to the first one
            .reverse()
            .map((name) => {
                // Select all not preferred and not last names
                if ((name.isPreferred === false)
                    && (name.isLastName === false)
                ) {
                    if (this.measureText(text, fontSize, fontWeight) > availableWidth) {
                        // Keep only the first letter
                        name.label = name.label.slice(0, 1) + ".";
                        text       = names.map(item => item.label).join(" ");
                    }
                }

                return name;
            })
            .map((name) => {
                // Afterward, the preferred ones, if text takes still too much space
                if (name.isPreferred === true) {
                    if (this.measureText(text, fontSize, fontWeight) > availableWidth) {
                        // Keep only the first letter
                        name.label = name.label.slice(0, 1) + ".";
                        text       = names.map(item => item.label).join(" ");
                    }
                }

                return name;
            })
            .map((name) => {
                // Finally truncate lastnames
                if (name.isLastName === true) {
                    if (this.measureText(text, fontSize, fontWeight) > availableWidth) {
                        // Keep only the first letter
                        name.label = name.label.slice(0, 1) + ".";
                        text       = names.map(item => item.label).join(" ");
                    }
                }

                return name;
            })
            // Revert reversed order again
            .reverse();
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
