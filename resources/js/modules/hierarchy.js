/**
 * This file is part of the package magicsunday/webtrees-pedigree-chart.
 *
 * For the full copyright and license information, please read the
 * LICENSE file distributed with this source code.
 */

import * as d3 from "./d3.js";
import {
    LAYOUT_HORIZONTAL_ALT_OFFSET,
    LAYOUT_OPTIONAL_ROW_HEIGHT,
    LAYOUT_VERTICAL_ALTNAME_OFFSET,
    LAYOUT_VERTICAL_IMAGE_SPACE,
    LAYOUT_VERTICAL_NICKNAME_OFFSET,
    LAYOUT_VITAL_OPTIONAL_GAP,
} from "./constants.js";

/**
 * @import { HierarchyNode, HierarchyPointNode } from "d3-hierarchy"
 * @import Configuration from "./configuration.js"
 */

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
        /** @type {HierarchyPointNode<any>|null} */
        this._nodes = null;
        /** @type {HierarchyNode<any>|null} */
        this._root = null;
    }

    /**
     * Initialize the hierarchical chart data.
     *
     * @param {object} datum The JSON encoded chart data
     */
    init(datum) {
        // Compact baseline (set in orientation-collection.js) reserves room for
        // the worst-case vital block (BIRT date + place, DEAT date + place).
        // We grow it on top of that when extra rows are needed.

        // Reserve room for the optional name lines (nickname, alternative
        // name) only when the toggle is on AND at least one individual in
        // the chart actually has one. Otherwise the reserved row would be
        // wasted whitespace between the name and the vital block.
        // Nicknames are gated server-side via showNicknames preference, so
        // by the time the data reaches us, datum.nickname is either set or
        // empty. A chart-wide check on the data alone tells us whether to
        // reserve a third name line.
        const nicknameVisible = this.treeHasNicknames(datum);
        const altNameVisible =
            this._configuration.showAlternativeName && this.treeHasAlternativeNames(datum);
        const imageVisible = this.treeHasImages(datum);
        this._configuration.nicknameVisible = nicknameVisible;
        this._configuration.altNameVisible = altNameVisible;
        this._configuration.imageVisible = imageVisible;

        // No portraits or silhouettes anywhere in the chart? Drop the
        // image strip from vertical boxes — it would otherwise be wasted
        // empty space at the top of every box.
        if (!imageVisible && this._configuration.orientation.isVertical) {
            this._configuration.orientation.boxHeight -= LAYOUT_VERTICAL_IMAGE_SPACE;
        }

        if (this._configuration.orientation.isVertical) {
            // Vertical layouts have a base name region of two lines; the
            // optional nickname row adds one extra 20 px line, the alt-name
            // sits 25 px below the surname (one line + 5 px gap so it
            // reads as a distinct label). The same 25 px gap is reused
            // between the alt-name and the vital block.
            if (nicknameVisible) {
                this._configuration.orientation.boxHeight += LAYOUT_VERTICAL_NICKNAME_OFFSET;
            }
            if (altNameVisible) {
                this._configuration.orientation.boxHeight += LAYOUT_VERTICAL_ALTNAME_OFFSET;
            }
        } else if (altNameVisible) {
            // Horizontal layouts always render the main name on a single
            // line; only the alt-name (when visible) shifts the vital
            // block down and needs extra height.
            this._configuration.orientation.boxHeight += LAYOUT_HORIZONTAL_ALT_OFFSET;
        }

        // Optional-block extension. factSlots[0..1] are the BIRT and DEAT
        // placeholders that always live in the vital block; everything past
        // index 2 is an optional CHART_BOX_TAGS row. The reserved row count
        // is the chart-wide maximum of *populated* optional slots — when no
        // individual fills more than 2 of 7 configured slots, the box only
        // grows by 2 rows, not 7.
        if (this._configuration.showAdditionalFacts) {
            const maxRows = this.maxPopulatedOptionalRows(datum);
            if (maxRows > 0) {
                // The first optional row sits LAYOUT_VITAL_OPTIONAL_GAP
                // below the vital block; each subsequent row adds another
                // LAYOUT_OPTIONAL_ROW_HEIGHT. The compact box already
                // covers the visual extent up to the vital block end, so
                // we only need to extend by gap + (N − 1) × row height.
                this._configuration.orientation.boxHeight +=
                    LAYOUT_VITAL_OPTIONAL_GAP + (maxRows - 1) * LAYOUT_OPTIONAL_ROW_HEIGHT;
            }
        }

        this._root = d3.hierarchy(datum, (datum) => datum.parents);

        // Assign a unique ID to each node — d3 HierarchyNode `id` is a
        // readonly getter, so we attach our own property under a typed view.
        this._root.ancestors().forEach((d, i) => {
            /** @type {any} */ (d).id = i;
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
     * Returns the laid-out tree (root node with x/y assigned by d3.tree()).
     *
     * @returns {HierarchyPointNode<any>|null}
     *
     * @public
     */
    get nodes() {
        return this._nodes;
    }

    /**
     * Returns the root node of the d3 hierarchy.
     *
     * @returns {HierarchyNode<any>|null}
     *
     * @public
     */
    get root() {
        return this._root;
    }

    /**
     * Walks the raw chart datum and returns the maximum number of
     * populated optional fact slots across all individuals. The vital
     * block (BIRT/DEAT placeholders at index 0 and 1) is excluded;
     * everything past index 2 counts as optional.
     *
     * @param {object} datum The JSON-encoded chart data passed into init()
     *
     * @returns {number}
     *
     * @private
     */
    maxPopulatedOptionalRows(datum) {
        let max = 0;
        const visit = (node) => {
            const facts = node?.data?.facts;
            if (Array.isArray(facts) && facts.length > 2) {
                const populated = facts.slice(2).filter((f) => f !== null).length;
                if (populated > max) {
                    max = populated;
                }
            }
            (node?.parents ?? []).forEach(visit);
        };
        visit(datum);
        return max;
    }

    /**
     * Returns true when at least one individual in the chart has a
     * non-empty alternativeName. Used to decide whether to reserve space
     * for an alternative-name line — otherwise we waste 30 px of vertical
     * whitespace when the configuration toggle is on but no individual
     * actually carries an alt name.
     *
     * @param {object} datum The JSON-encoded chart data passed into init()
     *
     * @returns {boolean}
     *
     * @private
     */
    treeHasAlternativeNames(datum) {
        let hit = false;
        const visit = (node) => {
            if (hit) return;
            if ((node?.data?.alternativeName ?? "") !== "") {
                hit = true;
                return;
            }
            (node?.parents ?? []).forEach(visit);
        };
        visit(datum);
        return hit;
    }

    /**
     * Returns true when at least one individual in the chart has a
     * non-empty nickname. Used to decide whether to reserve a third name
     * line — otherwise the box would carry 20 px of dead space between
     * the given names and the surname.
     *
     * @param {object} datum The JSON-encoded chart data passed into init()
     *
     * @returns {boolean}
     *
     * @private
     */
    treeHasNicknames(datum) {
        let hit = false;
        const visit = (node) => {
            if (hit) return;
            if ((node?.data?.nickname ?? "") !== "") {
                hit = true;
                return;
            }
            (node?.parents ?? []).forEach(visit);
        };
        visit(datum);
        return hit;
    }

    /**
     * Returns true when at least one individual in the chart has either
     * a thumbnail or a silhouette URL — i.e. the box should reserve space
     * for the portrait strip. Trees with the silhouette toggle off and
     * no per-individual photos (issue #67-style imports) skip the image
     * area entirely.
     *
     * @param {object} datum The JSON-encoded chart data passed into init()
     *
     * @returns {boolean}
     *
     * @private
     */
    treeHasImages(datum) {
        let hit = false;
        const visit = (node) => {
            if (hit) return;
            const data = node?.data;
            if ((data?.thumbnail ?? "") !== "" || (data?.silhouette ?? "") !== "") {
                hit = true;
                return;
            }
            (node?.parents ?? []).forEach(visit);
        };
        visit(datum);
        return hit;
    }
}
