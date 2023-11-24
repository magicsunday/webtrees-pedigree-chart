/**
 * This file is part of the package magicsunday/webtrees-pedigree-chart.
 *
 * For the full copyright and license information, please read the
 * LICENSE file distributed with this source code.
 */

import * as d3 from "../lib/d3";
import {SEX_FEMALE, SEX_MALE} from "../lib/constants.js";

/**
 * This class handles the hierarchical data.
 *
 * @author  Rico Sonntag <mail@ricosonntag.de>
 * @license https://opensource.org/licenses/GPL-3.0 GNU General Public License v3.0
 * @link    https://github.com/magicsunday/webtrees-pedigree-chart/
 */
export default class Hierarchy
{
    /**
     * Constructor.
     *
     * @param {Configuration} configuration The application configuration
     */
    constructor(configuration)
    {
        this._configuration = configuration;
        this._nodes         = null;
        this._root          = null;
    }

    /**
     * Initialize the hierarchical chart data.
     *
     * @param {Object} data The JSON encoded chart data
     */
    init(data)
    {
        // Get the greatest depth
        const getDepth       = ({parents}) => 1 + (parents ? Math.max(...parents.map(getDepth)) : 0);
        const maxGenerations = getDepth(data);

        // Construct root node from the hierarchical data
        this._root = d3.hierarchy(
            data,
            data => {
                if (!this._configuration.showEmptyBoxes) {
                    return data.parents;
                }

                // Fill up the missing parents to the requested number of generations
                if (!data.parents && (data.data.generation < maxGenerations)) {
                // if (!data.parents && (data.data.generation < this._configuration.generations)) {
                    data.parents = [
                        this.createEmptyNode(data.data.generation + 1, SEX_MALE),
                        this.createEmptyNode(data.data.generation + 1, SEX_FEMALE)
                    ];
                }

                // Add missing parent record if we got only one
                if (data.parents && (data.parents.length < 2)) {
                    if (data.parents[0].sex === SEX_MALE) {
                        data.parents.push(
                            this.createEmptyNode(data.data.generation + 1, SEX_FEMALE)
                        );
                    } else {
                        data.parents.unshift(
                            this.createEmptyNode(data.data.generation + 1, SEX_MALE)
                        );
                    }
                }

                return data.parents;
            });

        // Assign a unique ID to each node
        this._root.ancestors().forEach((d, i) => {
            d.id = i;
        });

        // Declares a tree layout and assigns the size
        const tree = d3.tree()
            .nodeSize([this._configuration.orientation.nodeWidth, this._configuration.orientation.nodeHeight])
            .separation(() => 1.0);

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
    get nodes()
    {
        return this._nodes;
    }

    /**
     * Returns the root note.
     *
     * @returns {Individual}
     *
     * @public
     */
    get root()
    {
        return this._root;
    }

    /**
     * Create an empty child node object.
     *
     * @param {Number} generation Generation of the node
     * @param {String} sex        The sex of the individual
     *
     * @returns {Data}
     *
     * @private
     */
    createEmptyNode(generation, sex)
    {
        return {
            data: {
                id              : 0,
                xref            : "",
                url             : "",
                updateUrl       : "",
                generation      : generation,
                name            : "",
                isNameRtl       : false,
                firstNames      : [],
                lastNames       : [],
                preferredName   : "",
                alternativeName : "",
                isAltRtl        : false,
                sex             : "U", // sex
                timespan        : ""
            }
        };
    }
}
