/**
 * See LICENSE.md file for further details.
 */

import {SEX_FEMALE, SEX_MALE} from "./hierarchy";

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
     * @param {Config}    config    The configuration
     * @param {Options}   options   The options
     * @param {Hierarchy} hierarchy The hierarchiecal data
     */
    constructor(config, options, hierarchy)
    {
        this.boxWidth  = 260;
        this.boxHeight = 80;

        this._config    = config;
        this._options   = options;
        this._hierarchy = hierarchy;

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
        let self = this;

        let node = this._config.visual
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

        nodeEnter.append("rect")
            .attr("class", d => (d.data.sex === SEX_FEMALE) ? "female" : (d.data.sex === SEX_MALE) ? "male" : "")
            .attr("rx", 40)
            .attr("ry", 40)
            .attr("x", -(this.boxWidth / 2))
            .attr("y", -(this.boxHeight / 2))
            .attr("width", this.boxWidth)
            .attr("height", this.boxHeight)
            .attr("fill-opacity", "0.5")
            .attr("fill", d => d.data.color);

        this.addImage(nodeEnter);

        // Name
        nodeEnter
            .filter(d => (d.data.xref !== ""))
            .append("text")
            .attr("dx", -(this.boxWidth / 2) + 80)
            .attr("dy", "-12px")
            .attr("text-anchor", "start")
            .attr("class", "name")
            .text(d => this.getName(d));

        // Birth date
        // nodeEnter.append("text")
        //     .attr("dx", -(this.boxWidth / 2) + 81)
        //     .attr("dy", "4px")
        //     .attr("text-anchor", "start")
        //     .attr("class", "born")
        //     .text(d => {
        //         return "\u2217 \u2736 \uFF0A";
        //     });

        nodeEnter
            .filter(d => (d.data.xref !== ""))
            .append("text")
            .attr("dx", -(this.boxWidth / 2) + 80)
            .attr("dy", "4px")
            .attr("text-anchor", "start")
            .attr("class", "born")
            .text(d => d.data.born);

        nodeEnter
            .filter(d => (d.data.xref !== ""))
            .append("text")
            .attr("dx", -(this.boxWidth / 2) + 80)
            .attr("dy", "17px")
            .attr("text-anchor", "start")
            .attr("class", "born")
            .text(d => d.data.died);

        // Death date
        // nodeEnter.append("text")
        //     .attr("dx", -(this.boxWidth / 2) + 80 + 0.3)
        //     .attr("dy", "18px")
        //     .attr("text-anchor", "start")
        //     .attr("class", "died")
        //     .text(d => {
        //         return "\u2020 \u2720";
        //     });

        // nodeEnter.append("text")
        //     .attr("dx", -(this.boxWidth / 2) + 75)
        //     .attr("dy", "18px")
        //     .attr("text-anchor", "start")
        //     .attr("class", "died")
        //     .text(d => {
        //         return d.data.died;
        //     });
    }

    // /**
    //  * Get the time span label of an person. Returns null if label
    //  * should not be displayed due empty data.
    //  *
    //  * @param {Object} data D3 data object
    //  *
    //  * @return {null|String}
    //  */
    // getTimeSpan(data) {
    //     if (data.data.xref === "") {
    //         return null;
    //     }
    //
    //     if (data.data.born || data.data.died) {
    //         return data.data.born + " - " + data.data.died;
    //     }
    //
    //     return null;
    // }

    /**
     * Returns the name of the individual.
     *
     * @param {Object} data D3 data object
     *
     * @return {null|String}
     */
    getName(data)
    {
        if (data.data.xref === "") {
            return null;
        }

        let splitted = data.data.name.split(" ");
        let length   = splitted.length;

        splitted[0] = splitted[0].substring(0, 1) + ".";

        return splitted.join(" ");

        // return data.data.name;
    }

    /**
     * Add the individual thumbnail image to the node.
     *
     * @param {Object} node D3 object
     */
    addImage(node)
    {
        // Background (only required of thumbnail has transparency (like the silhouettes))
        node.append("circle")
            .attr("cx", -(this.boxWidth / 2) + 40)
            .attr("cy", -(this.boxHeight / 2) + 40)
            .attr("r", 35)
            .attr("fill", "#fff");

        // The individual image
        node.append("svg:image")
            .attr("xlink:href", d => {
                if (d.data.thumbnail) {
                    return d.data.thumbnail;
                }

                if (d.data.sex === SEX_FEMALE) {
                    return "modules_v4/webtrees-pedigree-chart/resources/images/silhouette_female.png";
                }

                if (d.data.sex === SEX_MALE) {
                    return "modules_v4/webtrees-pedigree-chart/resources/images/silhouette_male.png";
                }

                return "modules_v4/webtrees-pedigree-chart/resources/images/silhouette_unknown.png";
            })
            .attr("x", -(this.boxWidth / 2) + 5)
            .attr("y", -(this.boxHeight / 2) + 5)
            .attr("height", 70)
            .attr("width", 70)
            .attr("clip-path", "url(#clip-circle)");

        // Border
        node.append("circle")
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
        let link = this._config.visual
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

        return "M" + (this._options.direction * sourceY) + "," + sourceX +
            "H" + (this._options.direction * (sourceY + (targetY - sourceY) / 2)) +
            "V" + targetX +
            "H" + (this._options.direction * targetY);
    }
}
