/**
 * This file is part of the package magicsunday/webtrees-pedigree-chart.
 *
 * For the full copyright and license information, please read the
 * LICENSE file distributed with this source code.
 */

import * as d3 from "../lib/d3";
import NodeDrawer from "../lib/tree/node-drawer";
import LinkDrawer from "../lib/tree/link-drawer";

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
     * @param {Hierarchy}     hierarchy     The hierarchical data
     */
    constructor(svg, configuration, hierarchy)
    {
        this._svg           = svg;
        this._configuration = configuration;
        this._hierarchy     = hierarchy;

        this._hierarchy.root.x0 = 0;
        this._hierarchy.root.y0 = 0;

        this._orientation = this._configuration.orientation;

        this._nodeDrawer = new NodeDrawer(this._svg, this._hierarchy, this._configuration);
        this._linkDrawer = new LinkDrawer(this._svg, this._configuration);

        this.draw(this._hierarchy.root);
    }

    /**
     * Draw the tree.
     *
     * @param {object} source The root object
     *
     * @public
     */
    draw(source)
    {
        /** @type {Individual[]} */
        const nodes = this._hierarchy.root.descendants();

        /** @type {Link[]} */
        const links = this._hierarchy.nodes.links();

        // // Start with only the first few generations of ancestors showing
        // nodes.forEach((person) => {
        //     if (person.parents) {
        //         person.parents.forEach((child) => this.collapse(child));
        //     }
        // });

        // To avoid artifacts caused by rounding errors when drawing the links,
        // we draw them first so that the nodes can then overlap them.
        this._linkDrawer.drawLinks(links, source);
        this._nodeDrawer.drawNodes(nodes, source);
    }

    /**
     * Centers the tree around all visible nodes.
     */
    centerTree()
    {
        // TODO Doesn't work

        console.log("centerTree");
        // const zoom = this._svg.zoom.get();
        //
        // d3.select(this._svg)
        //     // .transition()
        //     // .duration(0)
        //     // .delay(100)
        //     .call(
        //         zoom.transform,
        //         d3.zoomIdentity.translate(t.x, t.y).scale(t.k)
        //     );
    }

    /**
     * Update a person's state when they are clicked.
     */
    togglePerson(event, person)
    {
        if (person.parents) {
            person._parents = person.parents;
            person.parents = null;
        } else {
            person.parents = person._parents;
            person._parents = null;
        }

        this.draw(person);
    }

    /**
     * Collapse person (hide their ancestors). We recursively collapse the ancestors so that when the person is
     * expanded it will only reveal one generation. If we don't recursively collapse the ancestors then when
     * the person is clicked on again to expand, all ancestors that were previously showing will be shown again.
     * If you want that behavior then just remove the recursion by removing the if block.
     */
    collapse(person)
    {
        if (person.parents) {
            person._parents = person.parents;
            person._parents.forEach((parent) => this.collapse(parent));
            // person._parents.forEach(this.collapse);
            person.parents = null;
        }

        // person.collapsed = true;
        //
        // if (person.parents) {
        //     person.parents.forEach((child) => this.collapse(child));
        //     person.parents.forEach(this.collapse);
        // }
    }
}
