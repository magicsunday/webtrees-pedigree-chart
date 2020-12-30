/**
 * See LICENSE.md file for further details.
 */

import {SEX_FEMALE, SEX_MALE, SEX_UNKNOWN} from "./chart/hierarchy";
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
        this._svg           = svg;
        this._configuration = configuration;
        this._hierarchy     = hierarchy;

        this._hierarchy.root.x0 = 0;
        this._hierarchy.root.y0 = 0;

        let orientations = {
            "top-to-bottom": {
                norm: (d) => { d.y = d.depth * (this._configuration.boxHeight + 30); },
                elbow: (d) => this.elbowVertical(d),
                x: function(d) { return d.x; },
                y: function(d) { return d.y; }
            },
            "bottom-to-top": {
                norm: (d) => { d.y = -1 * d.depth * (this._configuration.boxHeight + 30); },
                elbow: (d) => this.elbowVertical(d, -1),
                x: function(d) { return d.x; },
                y: function(d) { return d.y; }
            },
            "left-to-right": {
                norm: (d) => { d.y = d.depth * (this._configuration.boxWidth + 30); },
                elbow: (d) => this.elbowHorizontal(d),
                x: function(d) { return d.y; },
                y: function(d) { return d.x; }
            },
            "right-to-left": {
                norm: (d) => { d.y = -1 * d.depth * (this._configuration.boxWidth + 30); },
                elbow: (d) => this.elbowHorizontal(d, -1),
                x: function(d) { return d.y; },
                y: function(d) { return d.x; }
            }
        };

        this._orientation = orientations[this._configuration.treeLayout];


        // Collapse after the second level
        // this._hierarchy.root.children.forEach((child) => this.collapse(child));

        this.draw(this._hierarchy.root);
    }

    /**
     * Draw the tree.
     *
     * @public
     */
    draw(source)
    {
        let nodes = this._hierarchy.nodes.descendants();
        let links = this._hierarchy.nodes.links();

        // // Start with only the first few generations of ancestors showing
        // nodes.forEach((person) => {
        //     if (person.children) {
        //         person.children.forEach((child) => this.collapse(child));
        //     }
        // });

        // Normalize for fixed-depth.
        nodes.forEach((person) => {
            this._orientation.norm(person);
        });

        this.drawLinks(links, source);
        this.drawNodes(nodes, source);

        // Stash the old positions for transition.
        nodes.forEach((person) => {
            person.x0 = person.x;
            person.y0 = person.y;
        });
    }

    // /**
    //  * Draw the tree.
    //  *
    //  * @public
    //  */
    // update(source)
    // {
    //     let nodes = this._hierarchy.nodes.descendants();
    //     let links = this._hierarchy.nodes.links();
    //
    //     // // Start with only the first few generations of ancestors showing
    //     // nodes.forEach((person) => {
    //     //     if (person.children) {
    //     //         person.children.forEach((child) => this.collapse(child));
    //     //     }
    //     // });
    //
    //     this.drawLinks(links, source);
    //     this.drawNodes(nodes, source);
    //
    //     // Stash the old positions for transition.
    //     nodes.forEach((person) => {
    //         person.x0 = person.x;
    //         person.y0 = person.y;
    //     });
    // }

    /**
     * Draw the person boxes.
     *
     * @param {Array} nodes Array of descendant nodes
     *
     * @private
     */
    drawNodes(nodes, source)
    {
        let i = 0;
        let that = this;

        let clipPath = this._svg
            .defs
            .get()
            .append('clipPath')
            .attr('id', 'clip-circle')
            .append("circle")
            .attr("r", this._configuration.imageRadius)
            .attr("cx", -(this._configuration.boxWidth / 2) + (this._configuration.boxHeight / 2))
            .attr("cy", 0);

        let t = this._svg.visual
            .transition()
            .duration(this._configuration.duration);

        let node = this._svg.visual
            .selectAll("g.person")
            .data(nodes, person => person.id || (person.id = ++i));

        let nodeEnter = node
            .enter()
            .append("g")
            .attr("class", "person")
            // Add new nodes at the right side of their child's box.
            // They will be transitioned into their proper position.
            // .attr("transform", person => {
            //     return "translate(" + (this._configuration.direction * (source.y0 + (this._configuration.boxWidth / 2))) + ',' + source.x0 + ")";
            // })
            // .attr("transform", person => {
            //     return "translate(" + (this._configuration.direction * (source.y + (this._configuration.boxWidth / 2))) + ',' + source.x + ")";
            // })
            // .attr("transform", person => `translate(${source.y0}, ${source.x0})`)
            .attr("transform", person => {
                return "translate(" + this._orientation.x(person) + "," + this._orientation.y(person) + ")";
            })
        // .on("click", this.togglePerson.bind(this))
        ;

        // Draw the rectangle person boxes. Start new boxes with 0 size so that we can
        // transition them to their proper size.
        nodeEnter
            .append("rect")
            .attr("class", d => (d.data.sex === SEX_FEMALE) ? "female" : (d.data.sex === SEX_MALE) ? "male" : "")
            .attr("rx", this._configuration.boxHeight / 2)
            .attr("ry", this._configuration.boxHeight / 2)
            // .attr("x", 0)
            // .attr("y", 0)
            // .attr("width", 0)
            // .attr("height", 0)
            .attr("x", -(this._configuration.boxWidth / 2))
            .attr("y", -(this._configuration.boxHeight / 2))
            .attr("width", this._configuration.boxWidth)
            .attr("height", this._configuration.boxHeight)
            .attr("fill-opacity", "0.5")
            .attr("fill", d => d.data.color);
        //

        // Names and Dates
        nodeEnter
            .filter(d => (d.data.xref !== ""))
            .each(function (d) {
                let element = d3.select(this);

                element
                    .append("title")
                    .text(d => d.data.name);

                let group = element
                    .append("g")
                    .attr("class", "image");

                // Background (only required of thumbnail has transparency (like the silhouettes))
                group
                    .append("circle")
                    .attr("cx", -(that._configuration.boxWidth / 2) + (that._configuration.boxHeight / 2))
                    .attr("cy", -(that._configuration.boxHeight / 2) + (that._configuration.boxHeight / 2))
                    .attr("r", that._configuration.imageRadius)
                    .attr("fill", "rgb(255, 255, 255)");

                // The individual image
                let image = group
                    .append("image")
                    .attr("x", -(that._configuration.boxWidth / 2) + 5)
                    .attr("y", -(that._configuration.boxHeight / 2) + 5)
                    .attr("height", that._configuration.imageDiameter)
                    .attr("width", that._configuration.imageDiameter)
                    .attr("clip-path", "url(#clip-circle)");

                dataUrl(that.getImageToLoad(d))
                    .then(dataUrl => image.attr("href", dataUrl));

                // Border
                group.append("circle")
                    .attr("cx", -(that._configuration.boxWidth / 2) + (that._configuration.boxHeight / 2))
                    .attr("cy", -(that._configuration.boxHeight / 2) + (that._configuration.boxHeight / 2))
                    .attr("r", that._configuration.imageRadius)
                    .attr("fill", "none")
                    .attr("stroke", "rgb(200, 200, 200)")
                    .attr("stroke-width", "1.5");


                let name = element
                    .append("g")
                    .attr("class", "name")
                    .append("text")
                    .attr("dx", (-(that._configuration.boxWidth / 2) + that._configuration.imageDiameter + 20 - 5) + "px")
                    .attr("dy", "-15px")
                    .attr("text-anchor", "start");

                that.addNames(name, d);

                let table = element
                    .append("g")
                    .attr("class", "table");

                let col1 = table.append("text")
                    .attr("dx", (-(that._configuration.boxWidth / 2) + that._configuration.imageDiameter + 20) + "px")
                    .attr("dy", "5px")
                    .attr("class", "date")
                    .attr("text-anchor", "middle")
                    .attr("dominant-baseline", "middle");

                if (d.data.birth) {
                    col1.append("tspan")
                        .text("\u2605")
                        .attr("x", "0px")
                        .attr("y", "0px");
                }

                if (d.data.death) {
                    let death = col1
                        .append("tspan")
                        .text("\u2020");

                    if (d.data.birth) {
                        death.attr("x", (-(that._configuration.boxWidth / 2) + that._configuration.imageDiameter + 20) + "px")
                            .attr("dy", "20px");
                    } else {
                        death.attr("x", "0px")
                            .attr("y", "0px");
                    }
                }

                let col2 = table.append("text")
                    .attr("dx", (-(that._configuration.boxWidth / 2) + that._configuration.imageDiameter + 20) + "px")
                    .attr("dy", "5px")
                    .attr("class", "date")
                    .attr("text-anchor", "start")
                    .attr("dominant-baseline", "middle");

                if (d.data.birth) {
                    col2.append("tspan")
                        .text(d.data.birth)
                        .attr("x", "10px")
                        .attr("y", "0px");
                }

                if (d.data.death) {
                    let death = col2.append("tspan")
                        .text(d.data.death);

                    if (d.data.birth) {
                        death
                            .attr("x", (-(that._configuration.boxWidth / 2) + that._configuration.imageDiameter + 20 + 10) + "px")
                            .attr("dy", "20px");
                    } else {
                        death.attr("x", "10px")
                            .attr("y", "0px");
                    }
                }
            });

    //     // Merge the update and the enter selections
    //     let nodeUpdate = nodeEnter.merge(node);
    //
    //     nodeUpdate
    //         .transition()
    //         .duration(this._configuration.duration)
    //         // .attr("transform", person => `translate(${person.y}, ${person.x})`);
    //         .attr("transform", person => {
    //             return "translate(" + (this._configuration.direction * person.y) + "," + person.x + ")";
    //         });
    //
    //     // Grow boxes to their proper size
    //     nodeUpdate.select('rect')
    //         .attr("x", -(this._configuration.boxWidth / 2))
    //         .attr("y", -(this._configuration.boxHeight / 2))
    //         .attr("width", this._configuration.boxWidth)
    //         .attr("height", this._configuration.boxHeight)
    //         // .attr("fill-opacity", "0.5")
    //         // .attr({
    //         //     x: -(this._configuration.boxWidth / 2),
    //         //     y: -(this._configuration.boxHeight / 2),
    //         //     width: this._configuration.boxWidth,
    //         //     height: this._configuration.boxHeight
    //         // })
    // ;
    //
    //     // Move text to it's proper position
    //     // nodeUpdate.select('text')
    //     //     .attr("dx", -(this._configuration.boxWidth / 2) + 10)
    //     //     .style("fill-opacity", 1);
    //
    //     // Remove nodes we aren't showing anymore
    //     let nodeExit = node
    //         .exit()
    //         .transition()
    //         .duration(this._configuration.duration)
    //         // Transition exit nodes to the source's position
    //         .attr("transform", person => {
    //             return "translate(" + (this._configuration.direction * (source.y + (this._configuration.boxWidth / 2))) + ',' + source.x + ")";
    //         })
    //         // .attr("transform", person => `translate(${source.y}, ${source.x})`)
    //         // .attr("transform", (d) => {
    //         //     return "translate(" + source.y + "," + source.x + ")";
    //         // })
    //         .remove();
    //
    //     // Shrink boxes as we remove them
    //     nodeExit.select('rect')
    //         .attr("x", 0)
    //         .attr("y", 0)
    //         .attr("width", 0)
    //         .attr("height", 0)
    //         // .attr("fill-opacity", 0)
    //         // .attr({
    //         //     x: 0,
    //         //     y: 0,
    //         //     width: 0,
    //         //     height: 0
    //         // })
    //     ;

        // Fade out the text as we remove it
        // nodeExit.select('text')
        //     .style('fill-opacity', 0)
        //     .attr('dx', 0);


        // nodeEnter
        //     .filter(d => (d.data.xref !== ""))
        //     .append("title")
        //     .text(d => d.data.name);

        // this.addImages(nodeEnter);

        // // Names and Dates
        // nodeEnter
        //     .filter(d => (d.data.xref !== ""))
        //     .each(function (d) {
        //         let parent = d3.select(this);
        //
        //         // Names
        //         let text1 = parent
        //             .append("text")
        //             .attr("dx", -(that.boxWidth / 2) + 80)
        //             .attr("dy", "-12px")
        //             .attr("text-anchor", "start")
        //             .attr("class", "name");
        //
        //         that.addNames(text1, d);
        //
        //         // Time span
        //         let text2 = parent
        //             .append("text")
        //             .attr("dx", -(that.boxWidth / 2) + 80)
        //             .attr("dy", "10px")
        //             .attr("text-anchor", "start")
        //             .attr("class", "date");
        //
        //         that.addTimeSpan(text2, d);
        //     });


        // node.join(
        //     enter => {
        //         let nodeEnter = enter
        //             .append("g")
        //             .attr("class", "person")
        //             // .attr("transform", person => `translate(${person.y}, ${person.x})`)
        //             .attr("transform", person => {
        //                 return "translate(" + (this._configuration.direction * (source.y0 + (this._configuration.boxWidth / 2))) + ',' + source.x0 + ")";
        //             })
        //             .on("click", this.togglePerson.bind(this));
        //
        //         nodeEnter
        //             .append("rect")
        //             // .attr("x", -(this._configuration.boxWidth / 2))
        //             // .attr("y", -(this._configuration.boxHeight / 2))
        //             // .attr("width", this._configuration.boxWidth)
        //             // .attr("height", this._configuration.boxHeight);
        //             .attr("x", 0)
        //             .attr("y", 0)
        //             .attr("width", 0)
        //             .attr("height", 0);
        //
        //         return nodeEnter;
        //     },
        //
        //     update => {
        //         let nodeUpdate = update
        //             .call(update => update
        //                 .transition(t)
        //                 .attr("transform", person => {
        //                     return "translate(" + (this._configuration.direction * person.y) + "," + person.x + ")";
        //                 })
        //             );
        //
        //         nodeUpdate
        //             .select('rect')
        //             .attr("x", -(this._configuration.boxWidth / 2))
        //             .attr("y", -(this._configuration.boxHeight / 2))
        //             .attr("width", this._configuration.boxWidth)
        //             .attr("height", this._configuration.boxHeight);
        //
        //         return nodeUpdate;
        //     },
        //
        //     exit => {
        //         let nodeExit = exit
        //             .call(exit => exit
        //                 .transition(t)
        //                 .attr("transform", person => {
        //                     return "translate(" + (this._configuration.direction * (source.y + (this._configuration.boxWidth / 2))) + ',' + source.x + ")";
        //                 })
        //             )
        //             .remove();
        //
        //         nodeExit
        //             .select('rect')
        //             .attr("x", 0)
        //             .attr("y", 0)
        //             .attr("width", 0)
        //             .attr("height", 0);
        //
        //         return nodeExit;
        //     }
        // )
        //     // .selectAll('rect')
        //     // .attr("x", -(this._configuration.boxWidth / 2))
        //     // .attr("y", -(this._configuration.boxHeight / 2))
        //     // .attr("width", this._configuration.boxWidth)
        //     // .attr("height", this._configuration.boxHeight);
        // ;
        //
        // return;

    }

    /**
     * Update a person's state when they are clicked.
     */
    togglePerson(event, person)
    {
        if (person.children) {
            person._children = person.children;
            person.children = null;
        } else {
            person.children = person._children;
            person._children = null;
        }

        this.draw(person);

        // if (person.collapsed) {
        //     person.collapsed = false;
        // } else {
        //     this.collapse(person);
        // }
        //
        // this.draw(person);
    }

    /**
     * Collapse person (hide their ancestors). We recursively
     * collapse the ancestors so that when the person is
     * expanded it will only reveal one generation. If we don't
     * recursively collapse the ancestors then when
     * the person is clicked on again to expand, all ancestors
     * that were previously showing will be shown again.
     * If you want that behavior then just remove the recursion
     * by removing the if block.
     */
    collapse(person)
    {
        if (person.children) {
            person._children = person.children;
            person._children.forEach((child) => this.collapse(child));
            // person._children.forEach(this.collapse);
            person.children = null;
        }

        // person.collapsed = true;
        //
        // if (person.children) {
        //     person.children.forEach((child) => this.collapse(child));
        //     person.children.forEach(this.collapse);
        // }
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
     * @param {Number}    dx     Additional space offset to add between names
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
     * @param {Boolean}   hide   Whether to show or hide the label if the text takes to much space to be displayed
     */
    truncateNames(parent, data, hide = false)
    {
        let availableWidth = this.getAvailableWidth(data);

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
     * @param {Object} data The D3 data object

     * @returns {Number} Calculated available width
     *
     * @private
     */
    getAvailableWidth(data)
    {
        return this._configuration.boxWidth - (this._configuration.imageDiameter + 20) - (this._configuration.padding * 2);
    }

    /**
     * Truncates the textual content of the actual element.
     *
     * @param {Selection} parent         The parent (<text> or <textPath>) element containing the <tspan> child elements
     * @param {Number}    availableWidth The total available width the text could take
     * @param {Boolean}   hide           Whether to show or hide the label if the text takes to much space to be displayed
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
     * @returns {Number}
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
        this.truncateNames(parent, datum);
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

        return "";
    }

    /**
     * Draw the connecting lines.
     *
     * @param {Array} links Array of links
     *
     * @private
     */
    drawLinks(links, source)
    {
        let that = this;

        let link = this._svg.visual
            .selectAll("path.link")
            .data(links, person => person.target.id);

        // Add new links. Transition new links from the source's old position to
        // the links final position.
        let linkEnter = link
            .enter()
            .append("path")
            .classed("link", true)
            .attr("d", person => this._orientation.elbow(person));

        // // Add new links. Transition new links from the source's old position to
        // // the links final position.
        // let linkEnter = link.enter()
        //     .append("path")
        //     .classed("link", true)
        //     .attr("d", person => {
        //         const o = {
        //             x: source.x0,
        //             y: this._configuration.direction * (source.y0 + (this._configuration.boxWidth / 2))
        //         };
        //
        //         return this.transitionElbow({ source: o, target: o });
        //     });
        //
        // var linkUpdate = linkEnter.merge(link);
        //
        // // Update the old links positions
        // linkUpdate.transition()
        //     .duration(this._configuration.duration)
        //     .attr("d", person => this.elbow(person));
        //
        // // Remove any links we don't need anymore if part of the tree was collapsed. Transition exit
        // // links from their current position to the source's new position.
        // link.exit()
        //     .transition()
        //     .duration(this._configuration.duration)
        //     .attr("d", person => {
        //         const o = {
        //             x: source.x,
        //             y: this._configuration.direction * (source.y + this._configuration.boxWidth / 2)
        //         };
        //
        //         return this.transitionElbow({ source: o, target: o });
        //     })
        //     .remove();
    }

    /**
     * Draw the vertical connecting lines between the profile boxes for Top/Bottom and Bottom/Top layout.
     *
     * @param {Object} datum D3 data object
     *
     * @private
     */
    elbowVertical(datum, direction)
    {
        direction = direction || 1;

        // Top => Bottom, Bottom => Top
        let sourceX = this._orientation.x(datum.source),
            sourceY = this._orientation.y(datum.source) + (direction * (this._configuration.boxHeight / 2)),
            targetX = this._orientation.x(datum.target),
            targetY = this._orientation.y(datum.target) - (direction * (this._configuration.boxHeight / 2));

        return "M " + sourceX + " " + sourceY +
            " V " + (sourceY + ((targetY - sourceY) / 2)) +
            " H " + targetX +
            " V " + targetY;
    }

    /**
     * Draw the horizontal connecting lines between the profile boxes for Left/Right and Right/Left layout.
     *
     * @param {Object} datum D3 data object
     *
     * @private
     */
    elbowHorizontal(datum, direction)
    {
        direction = direction || 1;

        // Left => Right, Right => Left
        let sourceX = this._orientation.y(datum.source),
            sourceY = this._orientation.x(datum.source) + (direction * (this._configuration.boxWidth / 2)),
            targetX = this._orientation.y(datum.target),
            targetY = this._orientation.x(datum.target) - (direction * (this._configuration.boxWidth / 2));

        return "M " + sourceY + " " + sourceX +
            " H " + (sourceY + ((targetY - sourceY) / 2)) +
            " V " + targetX +
            " H " + targetY;
    }

    // /**
    //  * Use a different elbow function for enter
    //  * and exit nodes. This is necessary because
    //  * the function above assumes that the nodes
    //  * are stationary along the x axis.
    //  *
    //  * @param {Object} datum D3 data object
    //  *
    //  * @private
    //  */
    // transitionElbow(datum)
    // {
    //     return "M" + datum.source.y + "," + datum.source.x
    //         + "H" + datum.source.y
    //         + "V" + datum.source.x
    //         + "H" + datum.source.y;
    // }
}
