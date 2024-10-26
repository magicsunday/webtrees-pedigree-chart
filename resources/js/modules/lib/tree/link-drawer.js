/**
 * This file is part of the package magicsunday/webtrees-pedigree-chart.
 *
 * For the full copyright and license information, please read the
 * LICENSE file distributed with this source code.
 */

/**
 * The class handles the creation of the tree.
 *
 * @author  Rico Sonntag <mail@ricosonntag.de>
 * @license https://opensource.org/licenses/GPL-3.0 GNU General Public License v3.0
 * @link    https://github.com/magicsunday/webtrees-pedigree-chart/
 */
export default class LinkDrawer
{
    /**
     * Constructor.
     *
     * @param {Svg}           svg
     * @param {Configuration} configuration The configuration
     */
    constructor(svg, configuration)
    {
        this._svg           = svg;
        this._configuration = configuration;
        this._orientation   = this._configuration.orientation;
    }

    /**
     * Draw the connecting lines.
     *
     * @param {Link[]}     links  Array of links
     * @param {Individual} source The root object
     *
     * @public
     */
    drawLinks(links, source)
    {
        this._svg.visual
            .selectAll("path.link")
            .data(links)
            .join(
                enter  => this.linkEnter(enter, source),
                update => this.linkUpdate(update),
                exit   => this.linkExit(exit, source)
            );
    }

    /**
     * Enter transition (new links).
     *
     * @param {Selection}  enter
     * @param {Individual} source
     *
     * @private
     */
    linkEnter(enter, source)
    {
        enter
            .append("path")
            .classed("link", true)
            .attr("d", link => this._orientation.elbow(link))
            .call(
                g => g.transition()
                    .duration(this._configuration.duration)
                    .attr("opacity", 1)
            );
    }

    /**
     * Update transition (existing links).
     *
     * @param {Selection} update
     *
     * @private
     */
    linkUpdate(update)
    {
        // TODO Enable for transitions
        // update
        //     .call(
        //         g => g.transition()
        //             // .duration(this._configuration.duration)
        //             .attr("opacity", 1)
        //             .attr("d", (link) => {
        //                 // link.source.x = source.x;
        //                 // link.source.y = source.y;
        //                 //
        //                 // if (link.target) {
        //                 //     link.target.x = source.x;
        //                 //     link.target.y = source.y;
        //                 // }
        //
        //                 return this._orientation.elbow(link);
        //             })
        //     );
    }

    /**
     * Exit transition (links to be removed).
     *
     * @param {Selection}  exit
     * @param {Individual} source
     *
     * @private
     */
    linkExit(exit, source)
    {
        // TODO Enable for transitions
        // exit
        //     .call(
        //         g => g.transition()
        //             .duration(this._configuration.duration)
        //             .attr("opacity", 0)
        //             .attr("d", (link) => {
        //                 // link.source.x = source.x;
        //                 // link.source.y = source.y;
        //                 //
        //                 // if (link.target) {
        //                 //     link.target.x = source.x;
        //                 //     link.target.y = source.y;
        //                 // }
        //
        //                 return this._orientation.elbow(link);
        //             })
        //             .remove()
        //     );
    }
}
