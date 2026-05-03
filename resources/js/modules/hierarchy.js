/**
 * This file is part of the package magicsunday/webtrees-pedigree-chart.
 *
 * For the full copyright and license information, please read the
 * LICENSE file distributed with this source code.
 */

import * as d3 from "./d3.js";
import { LAYOUT_VERTICAL_NODE_HEIGHT_OFFSET } from "./constants.js";

/**
 * This class handles the hierarchical data.
 *
 * @author  Rico Sonntag <mail@ricosonntag.de>
 * @license https://opensource.org/licenses/GPL-3.0 GNU General Public License v3.0
 * @link    https://github.com/magicsunday/webtrees-pedigree-chart/
 */
export default class Hierarchy {
    /**
     * Constructor.
     *
     * @param {Configuration} configuration The application configuration
     */
    constructor(configuration) {
        this._configuration = configuration;
        this._nodes = null;
        this._root = null;
    }

    /**
     * Initialize the hierarchical chart data.
     *
     * @param {object} datum The JSON encoded chart data
     */
    init(datum) {
        // Adjust box height if we are going to display the alternative names
        if (this._configuration.showAlternativeName && this._configuration.orientation.isVertical) {
            this._configuration.orientation.boxHeight += LAYOUT_VERTICAL_NODE_HEIGHT_OFFSET;
        }

        this._root = d3.hierarchy(datum, (datum) => datum.parents);

        // Assign a unique ID to each node
        this._root.ancestors().forEach((d, i) => {
            d.id = i;
        });

        // Declares a tree layout and assigns the size.
        // Same-parent siblings sit adjacent (1.0 × nodeWidth); cross-parent
        // cousin branches use 1.25 × nodeWidth so distinct family lines stay
        // visually distinguishable without wasting horizontal space (issue #74).
        const tree = d3
            .tree()
            .nodeSize([
                this._configuration.orientation.nodeWidth,
                this._configuration.orientation.nodeHeight,
            ])
            .separation((left, right) => (left.parent === right.parent ? 1.0 : 1.25));

        // Map the root node data to the tree layout
        this._nodes = tree(this._root);

        // Normalize node coordinates (swap values for left/right layout)
        this._root.each((node) => {
            this._configuration.orientation.norm(node);
        });
    }

    /**
     * Returns the nodes.
     *
     * @returns {Individual[]}
     *
     * @public
     */
    get nodes() {
        return this._nodes;
    }

    /**
     * Returns the root note.
     *
     * @returns {Individual}
     *
     * @public
     */
    get root() {
        return this._root;
    }
}
