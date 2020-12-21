/**
 * See LICENSE.md file for further details.
 */

import {SEX_FEMALE, SEX_MALE} from "./chart/hierarchy";
import * as d3 from "./d3";
import dataUrl from "./common/dataUrl";

/**
 * The class handles the creation of the tree.
 *
 * @author  Rico Sonntag <mail@ricosonntag.de>
 * @license https://opensource.org/licenses/GPL-3.0 GNU General Public License v3.0
 * @link    https://github.com/magicsunday/webtrees-pedigree-chart/
 */
export default class Tree
{
    /**
     * Constructor.
     *
     * @param {Svg}           svg
     * @param {Configuration} configuration The configuration
     * @param {Hierarchy}     hierarchy     The hierarchiecal data
     */
    constructor(svg, configuration, hierarchy)
    {
        this.boxWidth  = 260;
        this.boxHeight = 80;
        this.padding   = 15;

        this._svg           = svg;
        this._configuration = configuration;
        this._hierarchy     = hierarchy;

        this.draw();
    }

    /**
     * Draw the tree.
     *
     * @public
     */
    draw()
    {
        // if (this._hierarchy.root) {
            let nodes = this._hierarchy.nodes.descendants();
            let links = this._hierarchy.nodes.links();

            // Normalize for fixed-depth.
            nodes.forEach(function (d) { d.y = d.depth * 300; });

            // let defs = this._svg
            //     .defs
            //     .get();
            //
            // nodes.forEach(function (d) {
            //     // .enter()
            //     defs.append('pattern')
            //         .attr("id", "image" + d.data.xref)
            //         // .attr("id", function (d) {
            //         //     return "image" + d.data.xref;
            //         // })
            //         .attr("width", 1)
            //         .attr("height", 1)
            //         .append("svg:image")
            //         .attr("xlink:href", d.data.thumbnail)
            //         // .attr("xlink:href", function (d) {
            //         //     return d.data.thumbnail;
            //         // })
            //         .attr("width", 250)
            //         .attr("height", 250);
            // });

            this.drawLinks(links);
            this.drawNodes(nodes);
        // } else {
        //     throw new Error("Missing root");
        // }

        return this;
    }

    /**
     * Draw the person boxes.
     *
     * @param {Array} nodes Array of descendant nodes
     *
     * @private
     */
    drawNodes(nodes)
    {
        let that = this;

        let node = this._svg.visual
            .selectAll("g.person")
            .data(nodes);

        let nodeEnter = node
            .enter()
            .append("g")
            .attr("class", "person")
            .attr("transform", d => `translate(${d.y}, ${d.x})`);

        nodeEnter
            .filter(d => (d.data.xref !== ""))
            .append("title")
            .text(d => d.data.name);

        nodeEnter
            .append("rect")
            .attr("class", d => (d.data.sex === SEX_FEMALE) ? "female" : (d.data.sex === SEX_MALE) ? "male" : "")
            .attr("rx", 40)
            .attr("ry", 40)
            .attr("x", -(this.boxWidth / 2))
            .attr("y", -(this.boxHeight / 2))
            .attr("width", this.boxWidth)
            .attr("height", this.boxHeight)
            .attr("fill-opacity", "0.5")
            .attr("fill", d => d.data.color);

        this.addImages(nodeEnter);

        // Names and Dates
        nodeEnter
            .filter(d => (d.data.xref !== ""))
            .each(function (d) {
                let parent = d3.select(this);

                // Names
                let text1 = parent
                    .append("text")
                    .attr("dx", -(that.boxWidth / 2) + 80)
                    .attr("dy", "-12px")
                    .attr("text-anchor", "start")
                    .attr("class", "name");

                that.addNames(text1, d);

                // Time span
                let text2 = parent
                    .append("text")
                    .attr("dx", -(that.boxWidth / 2) + 80)
                    .attr("dy", "10px")
                    .attr("text-anchor", "start")
                    .attr("class", "date");

                that.addTimeSpan(text2, d);
            });
    }

    /**
     * Creates a single <tspan> element for each single given name and append it to the
     * parent element. The "tspan" element containing the preferred name gets an
     * additional underline style in order to highlight this one.
     *
     * @param {Selection} parent The parent (<text> or <textPath>) element to which the <tspan> elements are to be attached
     * @param {Object}    datum  The D3 data object containing the individual data
     */
    addFirstNames(parent, datum)
    {
        let i = 0;

        for (let firstName of datum.data.firstNames) {
            // Create a <tspan> element for each given name
            let tspan = parent.append("tspan")
                .text(firstName);

            // The preferred name
            if (firstName === datum.data.preferredName) {
                tspan.attr("class", "preferred");
            }

            // Add some spacing between the elements
            if (i !== 0) {
                tspan.attr("dx", "0.25em");
            }

            ++i;
        }
    }

    /**
     * Creates a single <tspan> element for each last name and append it to the parent element.
     *
     * @param {Selection} parent The parent (<text> or <textPath>) element to which the <tspan> elements are to be attached
     * @param {Object}    datum  The D3 data object containing the individual data
     * @param {number}    dx     Additional space offset to add between names
     */
    addLastNames(parent, datum, dx = 0)
    {
        let i = 0;

        for (let lastName of datum.data.lastNames) {
            // Create a <tspan> element for the last name
            let tspan = parent.append("tspan")
                .text(lastName);

            // Add some spacing between the elements
            if (i !== 0) {
                tspan.attr("dx", "0.25em");
            }

            if (dx !== 0) {
                tspan.attr("dx", dx + "em");
            }

            ++i;
        }
    }

    /**
     * Creates a single <tspan> element for the time span append it to the parent element.
     *
     * @param {Selection} parent The parent (<text> or <textPath>) element to which the <tspan> elements are to be attached
     * @param {Object}    datum  The D3 data object containing the individual data
     */
    addTimeSpan(parent, datum)
    {
        // Create a <tspan> element for the time span
        parent.append("tspan")
            .text(datum.data.timespan);
    }

    /**
     * Loops over the <tspan> elements and truncates the contained texts.
     *
     * @param {Selection} parent The parent (<text> or <textPath>) element to which the <tspan> elements are attached
     * @param {Object}    data   The D3 data object containing the individual data
     * @param {number}    index  The index position of the element in parent container.
     * @param {boolean}   hide   Whether to show or hide the label if the text takes to much space to be displayed
     */
    truncateNames(parent, data, index, hide = false)
    {
        let availableWidth = this.getAvailableWidth(data, index);

        // Start truncating those elements which are not the preferred ones
        parent.selectAll("tspan:not(.preferred)")
            .each(this.truncateText(parent, availableWidth, hide));

        // Afterwards the preferred ones if text takes still to much space
        parent.selectAll("tspan.preferred")
            .each(this.truncateText(parent, availableWidth, hide));
    }

    /**
     * Calculate the available text width. Depending on the depth of an entry in
     * the chart the available width differs.
     *
     * @param {Object} data  The D3 data object
     * @param {number} index The index position of element in parent container.
     *
     * @returns {number} Calculated available width
     *
     * @private
     */
    getAvailableWidth(data, index)
    {
        return this.boxWidth - 80 - (this.padding * 2);
    }

    /**
     * Truncates the textual content of the actual element.
     *
     * @param {Selection} parent         The parent (<text> or <textPath>) element containing the <tspan> child elements
     * @param {number}    availableWidth The total available width the text could take
     * @param {boolean}   hide           Whether to show or hide the label if the text takes to much space to be displayed
     */
    truncateText(parent, availableWidth, hide = false)
    {
        let that = this;

        return function () {
            let textLength = that.getTextLength(parent);
            let tspan      = d3.select(this);
            let text       = tspan.text();

            if (textLength > availableWidth) {
                if (hide) {
                    tspan.text("");
                } else {
                    if (text.length > 1) {
                        // Keep only the first letter
                        tspan.text(text.slice(0, 1) + ".");
                    }
                }
            }
        };
    }

    /**
     * Returns a float representing the computed length of all <tspan> elements within the element.
     *
     * @param {Selection} parent The parent (<text> or <textPath>) element containing the <tspan> child elements
     *
     * @returns {number}
     */
    getTextLength(parent)
    {
        let totalWidth = 0;

        // Calculate the total used width of all <tspan> elements
        parent.selectAll("tspan").each(function () {
            totalWidth += this.getComputedTextLength();
        });

        return totalWidth;
    }

    /**
     * Add the individual names to the given parent element.
     *
     * @param {Selection} parent The parent element to which the elements are to be attached
     * @param {Object}    data   The D3 data object
     */
    addNames(parent, datum)
    {
        this.addFirstNames(parent, datum);
        this.addLastNames(parent, datum, 0.25);
        this.truncateNames(parent, datum, 0);
    }

    /**
     * Return the image file or the placeholder.
     *
     * @param {Object} data The D3 data object
     *
     * @returns {String}
     */
    getImageToLoad(datum)
    {
        if (datum.data.thumbnail) {
            return datum.data.thumbnail;
        }

        if (datum.data.sex === SEX_FEMALE) {
            return "modules_v4/webtrees-pedigree-chart/resources/images/silhouette_female.png";
        }

        if (datum.data.sex === SEX_MALE) {
            return "modules_v4/webtrees-pedigree-chart/resources/images/silhouette_male.png";
        }

        return "modules_v4/webtrees-pedigree-chart/resources/images/silhouette_unknown.png";
    }

    /**
     * Add the individual thumbnail image to the node.
     *
     * @param {Selection} parent The parent element to which the elements are to be attached
     */
    addImages(parent)
    {
        let that = this;

        // Background (only required of thumbnail has transparency (like the silhouettes))
        parent.append("circle")
            .attr("cx", -(this.boxWidth / 2) + 40)
            .attr("cy", -(this.boxHeight / 2) + 40)
            .attr("r", 35)
            .attr("fill", "rgb(255, 255, 255)");

        parent
            .filter(d => (d.data.xref !== ""))
            .each(function (d) {
                let parent = d3.select(this);

                // The individual image
                let image = parent
                    .append("image")
                    .attr("x", -(that.boxWidth / 2) + 5)
                    .attr("y", -(that.boxHeight / 2) + 5)
                    .attr("height", 70)
                    .attr("width", 70)
                    .attr("clip-path", "url(#clip-circle)");

                dataUrl(that.getImageToLoad(d))
                    .then(dataUrl => image.attr("href", dataUrl));
            });

        // Border
        parent.append("circle")
            .attr("cx", -(this.boxWidth / 2) + 40)
            .attr("cy", -(this.boxHeight / 2) + 40)
            .attr("r", 35)
            .attr("fill", "none")
            .attr("stroke", "rgb(200, 200, 200)")
            .attr("stroke-width", "1.5");
    }

    /**
     * Draw the connecting lines.
     *
     * @param {Array} links Array of links
     *
     * @private
     */
    drawLinks(links)
    {
        let link = this._svg.visual
            .selectAll("path.link")
            .data(links);

        link.enter()
            .append("path")
            .classed("link", true)
            .attr("d", d => this.elbow(d));
    }

    /**
     * Draw the connecting lines between the profile boxes.
     *
     * @param {Object} data D3 data object
     *
     * @private
     */
    elbow(data)
    {
        let sourceX = data.source.x,
            sourceY = data.source.y + (this.boxWidth / 2),
            targetX = data.target.x,
            targetY = data.target.y - (this.boxWidth / 2);

        return "M" + (this._configuration.direction * sourceY) + "," + sourceX +
            "H" + (this._configuration.direction * (sourceY + (targetY - sourceY) / 2)) +
            "V" + targetX +
            "H" + (this._configuration.direction * targetY);
    }
}
