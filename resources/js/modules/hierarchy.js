/**
 * This file is part of the package magicsunday/webtrees-pedigree-chart.
 *
 * For the full copyright and license information, please read the
 * LICENSE file distributed with this source code.
 */

import * as d3 from "./d3.js";
import {
    LAYOUT_HORIZONTAL_ALT_OFFSET,
    LAYOUT_HORIZONTAL_IMAGE_MIN_HEIGHT,
    LAYOUT_HORIZONTAL_NODE_WIDTH_COMPACT,
    LAYOUT_HORIZONTAL_PLACE_ROW_RESERVATION,
    LAYOUT_OPTIONAL_ROW_HEIGHT,
    LAYOUT_VERTICAL_ALTNAME_OFFSET,
    LAYOUT_VERTICAL_IMAGE_SPACE,
    LAYOUT_VERTICAL_NICKNAME_OFFSET,
    LAYOUT_VERTICAL_NODE_HEIGHT_MINIMAL,
    LAYOUT_VERTICAL_NODE_WIDTH_COMPACT,
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
        // Effective places state: user toggle AND at least one BIRT or
        // DEAT in the chart actually carries a place. With the toggle on
        // but every individual lacking a place, the place row would just
        // be reserved empty space — collapse the chart to compact mode.
        const placesVisible = this._configuration.showPlaces && this.treeHasVitalPlaces(datum);
        this._configuration.nicknameVisible = nicknameVisible;
        this._configuration.altNameVisible = altNameVisible;
        this._configuration.imageVisible = imageVisible;
        // Overwrite the JS-side toggle with the effective value so every
        // downstream reader (vital baseY, row renderers, minimal-mode
        // detection) sees a single coherent flag.
        this._configuration.showPlaces = placesVisible;

        // The orientation arrives at the BASE_HEIGHT (sized for the
        // full vital block — date + place per pair). When places are
        // off chart-wide there's no place row to host, so trim the box
        // by the place-row reservation. Vertical substitutes the
        // minimal baseline directly. Horizontal shrinks by the same
        // 28 px delta only if the trimmed box would still hold the
        // 85 px image strip at full size — otherwise the image would
        // clamp to a smaller radius (image.js), which is unwanted.
        if (!placesVisible) {
            if (this._configuration.orientation.isVertical) {
                this._configuration.orientation.boxHeight = LAYOUT_VERTICAL_NODE_HEIGHT_MINIMAL;
            } else {
                this._configuration.orientation.boxHeight -=
                    LAYOUT_HORIZONTAL_PLACE_ROW_RESERVATION;
            }
        }

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
        } else if (altNameVisible && placesVisible) {
            // Horizontal layouts always render the main name on a single
            // line; only the alt-name (when visible) shifts the vital
            // block down and needs extra height — but in compact mode
            // (no places) the alt-name fits within the image-bound
            // minimum (100 px), so no extension is needed there.
            this._configuration.orientation.boxHeight += LAYOUT_HORIZONTAL_ALT_OFFSET;
        }

        // Optional-block extension. factSlots[0..1] are the BIRT and DEAT
        // placeholders that always live in the vital block; everything past
        // index 2 is an optional CHART_BOX_TAGS row. The reserved row count
        // is the chart-wide maximum of *populated* optional slots — when no
        // individual fills more than 2 of 7 configured slots, the box only
        // grows by 2 rows, not 7.
        const optionalRows = this._configuration.showAdditionalFacts
            ? this.maxPopulatedOptionalRows(datum)
            : 0;
        // Surface to facts.js / renderers: when optional rows fill the
        // box bottom, vitalCompactShift skips the "anchor dates to
        // bottom" shift (otherwise dates would float in the middle with
        // a wide gap below the alt-name).
        this._configuration.optionalRows = optionalRows;
        if (optionalRows > 0) {
            // The first optional row sits LAYOUT_VITAL_OPTIONAL_GAP
            // below the vital block; each subsequent row adds another
            // LAYOUT_OPTIONAL_ROW_HEIGHT. The compact box already
            // covers the visual extent up to the vital block end, so
            // we only need to extend by gap + (N − 1) × row height.
            this._configuration.orientation.boxHeight +=
                LAYOUT_VITAL_OPTIONAL_GAP + (optionalRows - 1) * LAYOUT_OPTIONAL_ROW_HEIGHT;
        }

        // Image-fit floor for horizontal: the box must stay tall enough
        // to host the 85 px image strip with its 7.5 px top/bottom
        // padding, otherwise the image clamps to a smaller radius. This
        // floor only matters when the trimmed/extended box is shorter
        // than the image — taller boxes (with optional rows extending
        // below the image) keep their content-driven height.
        if (
            !this._configuration.orientation.isVertical &&
            imageVisible &&
            this._configuration.orientation.boxHeight < LAYOUT_HORIZONTAL_IMAGE_MIN_HEIGHT
        ) {
            this._configuration.orientation.boxHeight = LAYOUT_HORIZONTAL_IMAGE_MIN_HEIGHT;
        }

        // Minimal mode: chart renders only the name region + the two
        // vital dates. No place rows, no optional rows. Nickname and
        // alt-name lines may still be present — they live in the name
        // region above the dates and shift everything below them down,
        // but they don't pull in the glyph column or place column that
        // would force the wider full layout. In vertical orientation
        // the box uses the narrower compact width (160 px) so the
        // simple "name(s) + two dates" layout sits tightly around the
        // centred dates instead of leaving a wide empty strip on
        // either side.
        const minimalMode = !this._configuration.showPlaces && optionalRows === 0;
        this._configuration.minimalMode = minimalMode;
        if (minimalMode) {
            // Orientation exposes only a boxHeight setter, not a boxWidth
            // setter — adding one in chart-lib would force a coordinated
            // release across consumer modules. The underscore-prefixed
            // backing field is the conventional "private" — pragmatic
            // assignment here keeps the chart-lib API stable. Heights
            // are already correct (MINIMAL/place-trim baseline applied
            // above plus nick/alt offsets and image-space subtraction).
            this._configuration.orientation._boxWidth = this._configuration.orientation.isVertical
                ? LAYOUT_VERTICAL_NODE_WIDTH_COMPACT
                : LAYOUT_HORIZONTAL_NODE_WIDTH_COMPACT;
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
     * Walks the chart datum depth-first (root → ancestors) and invokes
     * `visitor` on every node. Walking stops as soon as the visitor
     * returns true — used by the `treeHas*` predicates for early-exit
     * existence checks. For aggregate walks (e.g. max-populated-rows)
     * the visitor returns nothing and the walk completes.
     *
     * @param {object}                          datum   The JSON-encoded chart data
     * @param {(node: object) => boolean|void}  visitor Called once per node
     *
     * @returns {boolean} True when the visitor short-circuited the walk
     *
     * @private
     */
    walkAncestry(datum, visitor) {
        const visit = (node) => {
            if (visitor(node) === true) {
                return true;
            }
            const parents = node?.parents ?? [];
            for (const parent of parents) {
                if (visit(parent)) {
                    return true;
                }
            }
            return false;
        };
        return visit(datum);
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
        this.walkAncestry(datum, (node) => {
            const facts = node?.data?.facts;
            if (Array.isArray(facts) && facts.length > 2) {
                const populated = facts.slice(2).filter((f) => f != null).length;
                if (populated > max) {
                    max = populated;
                }
            }
        });
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
        return this.walkAncestry(datum, (node) => (node?.data?.alternativeName ?? "") !== "");
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
        return this.walkAncestry(datum, (node) => (node?.data?.nickname ?? "") !== "");
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
        // Mirror what the node drawer actually renders: the image group is
        // appended only when `thumbnail` is non-empty (silhouette serves
        // strictly as the onerror fallback URL inside that group). Counting
        // silhouettes here would mark silhouette-only trees as having
        // images, reserve the strip, and never render anything into it —
        // leaving an empty portrait area at the top of every box.
        return this.walkAncestry(datum, (node) => (node?.data?.thumbnail ?? "") !== "");
    }

    /**
     * Returns true when at least one individual in the chart has a
     * non-empty place on a vital fact (BIRT or DEAT — slots 0 and 1).
     * Used to suppress the place-row reservation when the toggle is on
     * but no individual actually carries a place — otherwise every box
     * would reserve a place row that never renders.
     *
     * @param {object} datum The JSON-encoded chart data passed into init()
     *
     * @returns {boolean}
     *
     * @private
     */
    treeHasVitalPlaces(datum) {
        return this.walkAncestry(datum, (node) => {
            const facts = node?.data?.facts ?? [];
            for (let i = 0; i < Math.min(2, facts.length); i++) {
                const fact = facts[i];
                if (fact && (fact.place ?? "") !== "") {
                    return true;
                }
            }
            return false;
        });
    }
}
