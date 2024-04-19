/**
 * This file is part of the package magicsunday/webtrees-pedigree-chart.
 *
 * For the full copyright and license information, please read the
 * LICENSE file distributed with this source code.
 */

import {LAYOUT_VERTICAL_NODE_HEIGHT_OFFSET, SEX_FEMALE, SEX_MALE} from "../constants";
import * as d3 from "../d3";
import dataUrl from "../common/dataUrl";
import Name from "./name";
import Date from "./date";
import Image from "../chart/box/image";
import Text from "../chart/box/text";

/**
 * The class handles the creation of the tree.
 *
 * @author  Rico Sonntag <mail@ricosonntag.de>
 * @license https://opensource.org/licenses/GPL-3.0 GNU General Public License v3.0
 * @link    https://github.com/magicsunday/webtrees-pedigree-chart/
 */
export default class NodeDrawer
{
    /**
     * Constructor.
     *
     * @param {Svg}           svg
     * @param {Hierarchy}     hierarchy     The hierarchical data
     * @param {Configuration} configuration The configuration
     */
    constructor(svg, hierarchy, configuration)
    {
        this._svg           = svg;
        this._hierarchy     = hierarchy;
        this._configuration = configuration;
        this._orientation   = this._configuration.orientation;

        this._image = new Image(this._orientation, 20);
        this._text  = new Text(this._orientation, this._image);
        this._name  = new Name(this._svg, this._orientation, this._image, this._text);
        this._date  = new Date(this._svg, this._orientation, this._image, this._text);
    }

    /**
     * Draw the person boxes.
     *
     * @param {Array}  nodes  Array of descendant nodes
     * @param {Object} source The root object
     *
     * @public
     */
    drawNodes(nodes, source)
    {
        // Image clip path
        this._svg
            .defs
            .get()
            .append("clipPath")
            .attr("id", "clip-image")
            .append("rect")
            .attr("rx", this._image.rx)
            .attr("ry", this._image.ry)
            .attr("x", this._image.x)
            .attr("y", this._image.y)
            .attr("width", this._image.width)
            .attr("height", this._image.height);

        this._svg.visual
            .selectAll("g.person")
            .data(nodes, person => person.id)
            .join(
                enter  => this.nodeEnter(enter, source),
                update => this.nodeUpdate(update),
                exit   => this.nodeExit(exit, source)
            );

        // this.centerTree();

        // Stash the old positions for transition
        this._hierarchy.root.eachBefore(d => {
            d.x0 = d.x;
            d.y0 = d.y;
        });
    }

    /**
     * Enter transition (new nodes).
     *
     * @param {selection}  enter
     * @param {Individual} source
     *
     * @private
     */
    nodeEnter(enter, source)
    {
        enter
            .append("g")
            .attr("opacity", 0)
            .attr("class", "person")
            .attr("transform", (person) => {
                return "translate(" + (person.x) + "," + (person.y) + ")";
                // TODO Enable this to zoom from source to person
                // return "translate(" + (source.x0) + "," + (source.y0) + ")";
            })
            // TODO Enable this to collapse/expand node on click
            // .on("click", (event, d) => this.togglePerson(event, d))
            .call(
                // Draw the actual person rectangle with opacity of 0.5
                g => {
                    g.append("rect")
                        .attr(
                            "class",
                            person => (person.data.data.sex === SEX_FEMALE)
                                ? "female"
                                : (person.data.data.sex === SEX_MALE) ? "male" : "unknown"
                        )
                        .classed("spouse", person => person.data.spouse)
                        .attr("rx", 20)
                        .attr("ry", 20)
                        .attr("x", -(this._orientation.boxWidth / 2))
                        .attr("y", -(this._orientation.boxHeight / 2))
                        .attr("width", this._orientation.boxWidth)
                        .attr("height", this._orientation.boxHeight)
                        .attr("fill-opacity", 0.5);

                    g.append("title")
                        .text(person => person.data.data.name);
                }
            )
            .call(
                // Draws the node (including image, names and dates)
                g => this.drawNode(g)
            )
            .call(
                g => g.transition()
                    .duration(this._configuration.duration)
                    // .delay(1000)
                    .attr("opacity", 1)
                // TODO Enable this to zoom from source to person
                // .attr("transform", (person) => {
                //     return "translate(" + (person.x) + "," + (person.y) + ")";
                // })
            );
    }

    /**
     * Update transition (existing nodes).
     *
     * @param {selection} update
     *
     * @private
     */
    nodeUpdate(update)
    {
        update
            .call(
                g => g.transition()
                    .duration(this._configuration.duration)
                    .attr("opacity", 1)
                    .attr("transform", (person) => {
                        return "translate(" + (person.x) + "," + (person.y) + ")";
                    })
            );
    }

    /**
     * Exit transition (nodes to be removed).
     *
     * @param {selection}  exit
     * @param {Individual} source
     *
     * @private
     */
    nodeExit(exit, source)
    {
        exit
            .call(
                g => g.transition()
                    .duration(this._configuration.duration)
                    .attr("opacity", 0)
                    .attr("transform", () => {
                        // Transition exit nodes to the source's position
                        return "translate(" + (source.x0) + "," + (source.y0) + ")";
                    })
                    .remove()
            );
    }

    /**
     * Draws the image and text nodes.
     *
     * @param {selection} parent The parent element to which the elements are to be attached
     *
     * @private
     */
    drawNode(parent)
    {
        const enter = parent.selectAll("g.image")
            .data((d) => {
                let images = [];

                if (d.data.data.thumbnail) {
                    images.push({
                        image: d.data.data.thumbnail
                    })
                }

                return images;
            })
            .enter();

        const group = enter.append("g")
            .attr("class", "image");

        // Background of image (only required if thumbnail has transparency (like the silhouettes))
        group
            .append("rect")
            .attr("x", this._image.x)
            .attr("y", this._image.y)
            .attr("width", this._image.width)
            .attr("height", this._image.height)
            .attr("rx", this._image.rx)
            .attr("ry", this._image.ry)
            .attr("fill", "rgb(255, 255, 255)");

        // The individual image
        group
            .append("image")
            .attr("x", this._image.x)
            .attr("y", this._image.y)
            .attr("width", this._image.width)
            .attr("height", this._image.height)
            .attr("clip-path", "url(#clip-image)");

        // Border around image
        group
            .append("rect")
            .attr("x", this._image.x)
            .attr("y", this._image.y)
            .attr("width", this._image.width)
            .attr("height", this._image.height)
            .attr("rx", this._image.rx)
            .attr("ry", this._image.ry)
            .attr("fill", "none")
            .attr("stroke", "rgb(200, 200, 200)")
            .attr("stroke-width", 1.5);

        // Asynchronously load the images
        d3.selectAll("g.image image")
            .each(function (d) {
                let image = d3.select(this);

                dataUrl(d.image)
                    .then(dataUrl => image.attr("xlink:href", dataUrl))
                    .catch((exception) => {
                        console.error(exception);
                    });
            });

        this._name.appendName(parent);
        this._date.appendDate(parent);
    }
}
