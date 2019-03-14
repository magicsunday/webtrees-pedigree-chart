/**
 * See LICENSE.md file for further details.
 */
import * as d3 from "./d3";

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
     * @param {Array}  data    The tree data
     * @param {Object} options
     */
    constructor(data, options)
    {
        this.nodeWidth  = 200;
        this.nodeHeight = 0;
        this.separation = 0.5;
        this._options   = options;
        this._nodes     = null;

        this.init(data);
    }

    /**
     * Initialize the hierarchical chart data.
     *
     * @param {Object} data JSON encoded data
     *
     * @public
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
                if (!this._options.showEmptyBoxes) {
                    return data.children;
                }

                // Fill up the missing children to the requested number of generations
                if (!data.children && (data.generation < maxGenerations)) {
                // if (!data.children && (data.generation < this._options.generations)) {
                    data.children = [
                        this.createEmptyNode(data.generation + 1),
                        this.createEmptyNode(data.generation + 1)
                    ];
                }

                // Add missing parent record if we got only one
                if (data.children && (data.children.length < 2)) {
                    if (data.children[0].sex === SEX_MALE) {
                        data.children.push(
                            this.createEmptyNode(data.generation + 1)
                        );
                    } else {
                        data.children.unshift(
                            this.createEmptyNode(data.generation + 1)
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
     * @param {Number} generation Generation of the node
     *
     * @return {Object}
     *
     * @private
     */
    createEmptyNode(generation)
    {
        return {
            id         : 0,
            xref       : "",
            sex        : "",
            generation : generation,
            color      : this._options.defaultColor,
        };
    }
}
