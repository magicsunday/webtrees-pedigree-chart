/**
 * This file is part of the package magicsunday/webtrees-pedigree-chart.
 *
 * For the full copyright and license information, please read the
 * LICENSE file distributed with this source code.
 */

import {
    elbowsPath,
    LINE_END_TRIM_PX,
    MARRIAGE_STAGGER_PX,
    marriagePath,
} from "@magicsunday/webtrees-chart-lib";

/**
 * Renders the connecting lines between profile boxes.
 *
 * Each `link` carries the d3-hierarchy positions of source (the person),
 * the matching spouse, and either a target (child → elbow line) or no
 * target (marriage line between the two spouses, possibly chained
 * through `link.coords` for polygamous continuations).
 *
 * The actual SVG `d` strings are produced by axis-agnostic helpers in
 * webtrees-chart-lib so descendants and pedigree share one geometry
 * implementation; this class only computes the source position and the
 * marriage cross-axis stagger from the link payload.
 *
 * @author  Rico Sonntag <mail@ricosonntag.de>
 * @license https://opensource.org/licenses/GPL-3.0 GNU General Public License v3.0
 * @link    https://github.com/magicsunday/webtrees-pedigree-chart/
 */
export default class LinkDrawer {
    constructor(svg, configuration) {
        this._svg = svg;
        this._configuration = configuration;
        this._orientation = this._configuration.orientation;
    }

    drawLinks(links, source) {
        this._svg.visual
            .selectAll("path.link")
            .data(links)
            .join((enter) => this._linkEnter(enter, source));
        // d3 join() falls back to identity for update and selection.remove for
        // exit — both are the desired behaviour here.
    }

    _linkEnter(enter, _source) {
        enter
            .append("path")
            .classed("link", true)
            .attr("d", (link) => this._buildPath(link))
            .call((g) => g.transition().duration(this._configuration.duration).attr("opacity", 1));
    }

    /**
     * Picks the right helper based on whether the link has a child target
     * (elbow to descendant) or not (marriage line between spouses).
     */
    _buildPath(link) {
        return link.target === null ? this._marriageChainPath(link) : this._childElbowPath(link);
    }

    /**
     * Source-drop + spine + per-child drop (single child) for a parent
     * → child connection. Source position depends on family index and
     * whether the source carries a real person or a placeholder.
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
     * Marriage line between spouse and source (with intermediate spouses
     * for polygamous continuations) drawn as straight segments through
     * the inter-box gaps so the line never crosses an unrelated box.
     */
    _marriageChainPath(link) {
        const o = this._orientation;
        const isVertical = o.isVertical;
        const halfBox = isVertical ? o.boxWidth / 2 : o.boxHeight / 2;

        const sequence = [
            { x: link.spouse.x, y: link.spouse.y },
            ...(link.coords ?? []).map((c) => ({ x: c.x, y: c.y })),
            { x: link.source.x, y: link.source.y },
        ];

        const stagger = this._spouseStagger(link);
        const crossAxisCoord = isVertical ? link.source.y - stagger : link.source.x - stagger;

        return marriagePath({
            sequence,
            isVertical,
            halfBox,
            trim: LINE_END_TRIM_PX,
            crossAxisCoord,
        });
    }

    /**
     * Compute where the elbow line emerges from the parent block.
     *
     * - First family with a spouse: between the source and its first
     *   spouse, on the staggered marriage line.
     * - Additional family: at the additional spouse box edge.
     * - Source has no spouse-data (placeholder): one step out from the
     *   spouse so the line clears the box.
     */
    _sourcePosition(link) {
        const o = this._orientation;
        const isVertical = o.isVertical;
        const halfBoxCross = isVertical ? o.boxHeight / 2 : o.boxWidth / 2;
        const halfBoxSpread = isVertical ? o.boxWidth / 2 : o.boxHeight / 2;
        const halfOffsetSpread = isVertical ? o.xOffset / 2 : o.yOffset / 2;

        let sourceX = link.source.x;
        let sourceY = link.source.y;

        if (typeof link.spouse !== "undefined" && link.source.data.family === 0) {
            // First family — emerge between individual and first spouse
            const stagger = this._spouseStagger(link);
            if (isVertical) {
                sourceX -= (link.source.x - link.spouse.x) / 2;
                sourceY -= stagger;
            } else {
                sourceX -= stagger;
                sourceY -= (link.source.y - link.spouse.y) / 2;
            }
        } else if (isVertical) {
            // Additional family — emerge at the additional spouse box edge
            sourceY += halfBoxCross * o.direction;
        } else {
            sourceX += halfBoxCross * o.direction;
        }

        // No spouse data on the source — one step out so the line clears
        if (link.source.data.data === null) {
            if (isVertical) {
                sourceX -= halfBoxSpread + halfOffsetSpread / 2;
                sourceY += halfBoxCross * o.direction;
            } else {
                sourceX += halfBoxCross * o.direction;
                sourceY -= halfBoxSpread + halfOffsetSpread / 2;
            }
        }

        return { x: sourceX, y: sourceY };
    }

    /**
     * Cross-axis offset for a marriage line in a multi-spouse group:
     * staggers the line so multiple marriages stay distinguishable.
     * Falls out of the (family - middle-of-spouses) × direction × step
     * formula the legacy elbow modules used.
     */
    _spouseStagger(link) {
        const middle = Math.ceil(link.spouse.data.spouses.length / 2);
        return (
            (link.source.data.family - middle) * this._orientation.direction * MARRIAGE_STAGGER_PX
        );
    }
}
