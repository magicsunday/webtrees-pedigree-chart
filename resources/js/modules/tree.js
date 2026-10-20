/**
 * This file is part of the package magicsunday/webtrees-pedigree-chart.
 *
 * For the full copyright and license information, please read the
 * LICENSE file distributed with this source code.
 */

import NodeDrawer from "./tree/node-drawer.js";
import LinkDrawer from "./tree/link-drawer.js";

/**
 * @import Svg from "./chart/svg.js"
 * @import Configuration from "./configuration.js"
 * @import Hierarchy, { Individual } from "./hierarchy.js"
 */

/**
 * The class handles the creation of the tree.
 *
 * @author  Rico Sonntag <mail@ricosonntag.de>
 * @license https://opensource.org/licenses/GPL-3.0 GNU General Public License v3.0
 * @link    https://github.com/magicsunday/webtrees-pedigree-chart/
 */
export default class Tree {
    /**
     * Constructor.
     *
     * @param {Svg}           svg
     * @param {Configuration} configuration The configuration
     * @param {Hierarchy}     hierarchy     The hierarchical data
     */
    constructor(svg, configuration, hierarchy) {
        this._svg = svg;
        this._configuration = configuration;
        this._hierarchy = hierarchy;

        const root = /** @type {any} */ (this._hierarchy.root);
        root.x0 = 0;
        root.y0 = 0;

        this._orientation = this._configuration.orientation;

        this._nodeDrawer = new NodeDrawer(this._svg, this._hierarchy, this._configuration);
        this._linkDrawer = new LinkDrawer(this._svg, this._configuration);

        this.draw(this._hierarchy.root);
    }

    /**
     * Draw the tree.
     *
     * @param {Individual} source The root object
     *
     * @public
     */
    draw(source) {
        const nodes = this._hierarchy.root.descendants();
        const links = this._hierarchy.nodes.links();

        // To avoid artifacts caused by rounding errors when drawing the links,
        // we draw them first so that the nodes can then overlap them.
        this._linkDrawer.drawLinks(links, source);
        this._nodeDrawer.drawNodes(nodes, source);
    }
}
