/**
 * This file is part of the package magicsunday/webtrees-pedigree-chart.
 *
 * For the full copyright and license information, please read the
 * LICENSE file distributed with this source code.
 */

import { elbowsPath } from "@magicsunday/webtrees-chart-lib/infra";

/**
 * @import { EnterElement, Selection } from "d3-selection"
 * @import { HierarchyPointLink } from "d3-hierarchy"
 * @import { LinkedTreeSvg as Svg } from "@magicsunday/webtrees-chart-lib/linked-tree"
 * @import Configuration from "../configuration.js"
 * @import { Individual } from "../hierarchy.js"
 */

/**
 * A d3-hierarchy link from a person to one of their parents.
 *
 * @typedef {HierarchyPointLink<any>} LinkDatum
 */

/**
 * Renders the connecting lines between profile boxes.
 *
 * Each `link` carries the d3-hierarchy positions of the source (the person) and
 * of the target (the parent) the elbow line runs to.
 *
 * The actual SVG `d` strings are produced by axis-agnostic helpers in
 * webtrees-chart-lib so descendants and pedigree share one geometry
 * implementation; this class only computes the source position from the link
 * payload.
 *
 * @author  Rico Sonntag <mail@ricosonntag.de>
 * @license https://opensource.org/licenses/GPL-3.0 GNU General Public License v3.0
 * @link    https://github.com/magicsunday/webtrees-pedigree-chart/
 */
export default class LinkDrawer {
    /**
     * Constructor.
     *
     * @param {Svg}           svg           The SVG instance
     * @param {Configuration} configuration The application configuration
     */
    constructor(svg, configuration) {
        this._svg = svg;
        this._configuration = configuration;
        this._orientation = this._configuration.orientation;
    }

    /**
     * Draws the connecting lines.
     *
     * @param {LinkDatum[]} links  The links to draw
     * @param {Individual}  source The root object
     */
    drawLinks(links, source) {
        this._svg.visual
            .selectAll("path.link")
            .data(links)
            .join((enter) => this._linkEnter(enter, source));
        // d3 join() falls back to identity for update and selection.remove for
        // exit — both are the desired behaviour here.
    }

    /**
     * Appends the path of every entering link.
     *
     * @param {Selection<EnterElement, LinkDatum, SVGGElement, unknown>} enter   The enter selection
     * @param {Individual}                                               _source The root object
     *
     * @return {Selection<SVGPathElement, LinkDatum, SVGGElement, unknown>}
     *
     * @private
     */
    _linkEnter(enter, _source) {
        return enter
            .append("path")
            .classed("link", true)
            .attr("d", (link) => this._childElbowPath(link))
            .call((g) => g.transition().duration(this._configuration.duration).attr("opacity", 1));
    }

    /**
     * Source-drop + spine + per-child drop (single child) for a parent → child
     * connection.
     *
     * @param {LinkDatum} link The link
     *
     * @return {string}
     *
     * @private
     */
    _childElbowPath(link) {
        const o = this._orientation;
        const isVertical = o.isVertical;
        const halfBoxCross = isVertical ? o.boxHeight / 2 : o.boxWidth / 2;
        const halfOffsetCross = isVertical ? o.yOffset / 2 : o.xOffset / 2;

        return elbowsPath({
            source: this._sourcePosition(link),
            children: [{ x: link.target.x, y: link.target.y }],
            isVertical,
            halfBoxCross,
            halfOffsetCross,
            direction: o.direction,
        });
    }

    /**
     * Compute where the elbow line emerges from the person's box, which is the
     * box edge facing the parents.
     *
     * @param {LinkDatum} link The link
     *
     * @return {{ x: number, y: number }}
     *
     * @private
     */
    _sourcePosition(link) {
        const o = this._orientation;
        const halfBoxCross = o.isVertical ? o.boxHeight / 2 : o.boxWidth / 2;

        return o.isVertical
            ? { x: link.source.x, y: link.source.y + halfBoxCross * o.direction }
            : { x: link.source.x + halfBoxCross * o.direction, y: link.source.y };
    }
}
