/**
 * See LICENSE.md file for further details.
 */

import * as d3 from "./../d3";
import Configuration from "./../configuration";

export const SEX_MALE   = "M";
export const SEX_FEMALE = "F";

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

        this.nodeWidth  = 200;
        this.nodeHeight = 0;
        this.separation = 0.5;
    }

    /**
     * Initialize the hierarchical chart data.
     *
     * @param {Object} data The JSON encoded chart data
     */
    init(data)
    {
        // Get the greatest depth
        const getDepth       = ({children}) => 1 + (children ? Math.max(...children.map(getDepth)) : 0);
        const maxGenerations = getDepth(data);

        // Construct root node from the hierarchical data
        let root = d3.hierarchy(
            data,
            data => {
                if (!this._configuration.showEmptyBoxes) {
                    return data.children;
                }

                // Fill up the missing children to the requested number of generations
                if (!data.children && (data.generation < maxGenerations)) {
                // if (!data.children && (data.generation < this._configuration.generations)) {
                    data.children = [
                        this.createEmptyNode(data.generation + 1, SEX_MALE),
                        this.createEmptyNode(data.generation + 1, SEX_FEMALE)
                    ];
                }

                // Add missing parent record if we got only one
                if (data.children && (data.children.length < 2)) {
                    if (data.children[0].sex === SEX_MALE) {
                        data.children.push(
                            this.createEmptyNode(data.generation + 1, SEX_FEMALE)
                        );
                    } else {
                        data.children.unshift(
                            this.createEmptyNode(data.generation + 1, SEX_MALE)
                        );
                    }
                }

                return data.children;
            });

        // Declares a tree layout and assigns the size
        const treeLayout = d3.tree()
            .nodeSize([this.nodeWidth, this.nodeHeight])
            .separation(d => this.separation);

        // Map the node data to the tree layout
        this._nodes = treeLayout(root);
    }

    /**
     * Returns the nodes.
     *
     * @returns {Array}
     *
     * @public
     */
    get nodes()
    {
        return this._nodes;
    }

    /**
     * Create an empty child node object.
     *
     * @param {number} generation Generation of the node
     * @param {string} sex        The sex of the individual
     *
     * @return {Object}
     *
     * @private
     */
    createEmptyNode(generation, sex)
    {
        return {
            id               : 0,
            xref             : "",
            url              : "",
            updateUrl        : "",
            generation       : generation,
            name             : "",
            firstNames       : [],
            lastNames        : [],
            preferredName    : "",
            alternativeNames : [],
            isAltRtl         : false,
            sex              : sex,
            timespan         : "",
            color            : this._configuration.defaultColor,
            colors           : [[], []]
        };
    }
}
