/**
 * This file is part of the package magicsunday/webtrees-pedigree-chart.
 *
 * For the full copyright and license information, please read the
 * LICENSE file distributed with this source code.
 */

import { measureText } from "@magicsunday/webtrees-chart-lib";
import * as d3 from "../d3.js";
import {
    LAYOUT_ALTNAME_CENTER_GAP,
    LAYOUT_GLYPH_COL_WIDTH,
    LAYOUT_NAME_TO_VITAL_GAP,
    LAYOUT_OPTIONAL_ROW_HEIGHT,
    LAYOUT_VERTICAL_ALTNAME_OFFSET,
    LAYOUT_VERTICAL_NICKNAME_OFFSET,
    LAYOUT_VITAL_COMPACT_PAIR_OFFSET,
    LAYOUT_VITAL_OPTIONAL_GAP,
    LAYOUT_VITAL_PAIR_OFFSET,
    LAYOUT_VITAL_PLACE_OFFSET,
    glyphForTag,
} from "../constants.js";

/**
 * @import { Selection } from "d3-selection"
 * @import { Orientation } from "@magicsunday/webtrees-chart-lib"
 * @import Svg from "../chart/svg.js"
 * @import ImageBox from "../chart/box/image.js"
 * @import TextBox from "../chart/box/text.js"
 *
 * @typedef {{tag: string, label: string, date: string, place: string, value: string}} FactView
 */

// Match webtrees-module-base FactResolver, which walks Gedcom::BIRTH_EVENTS
// (BIRT/CHR/BAPM) and DEATH_EVENTS (DEAT/BURI/CREM) and writes the actual
// found tag into the slot. Filtering only on BIRT/DEAT/MARR would silently
// drop christening, baptism, burial and cremation entries that an older
// GEDCOM uses as the primary vital event.
const VITAL_TAGS = new Set(["BIRT", "CHR", "BAPM", "DEAT", "BURI", "CREM", "MARR"]);

/**
 * Renders the vital block (BIRT/MARR/DEAT) and the optional block
 * (configurable CHART_BOX_TAGS) inside each person box.
 *
 * Vital rows use the fan-chart tooltip pattern: a glyph column (★/†/⚭)
 * plus a date in row 1, then an indented place row directly underneath
 * with no glyph. The place row is omitted entirely when no place is
 * known, so the height of the populated vital block is data-dependent;
 * the chart-wide worst case ({@see vitalBlockHeight}) is reserved by the
 * orientation so all boxes still align.
 *
 * Optional rows use the same glyph column. The glyph is resolved from
 * the GEDCOM tag via the curated map in constants.js, with a neutral
 * fallback for tags an admin added that we have not curated. Empty
 * optional slots are skipped — the row's vertical space is still
 * reserved at the chart-wide level so all boxes share the same bounding
 * rect, but no glyph or value is drawn for that individual.
 *
 * @author  Rico Sonntag <mail@ricosonntag.de>
 * @license https://opensource.org/licenses/GPL-3.0 GNU General Public License v3.0
 * @link    https://github.com/magicsunday/webtrees-pedigree-chart/
 */
export default class FactsRenderer {
    /**
     * Constructor.
     *
     * @param {Svg}         svg
     * @param {Orientation} orientation
     * @param {ImageBox}    image
     * @param {TextBox}     text
     */
    constructor(svg, orientation, image, text) {
        this._svg = svg;
        this._orientation = orientation;
        this._image = image;
        this._text = text;
    }

    /**
     * Add the vital fact rows (and, when the per-chart "Show additional
     * facts" toggle is on, the optional fact rows) to the given parent
     * selection. Picks the vertical or horizontal sub-renderers based on
     * the active orientation. Visual separation between the two blocks
     * comes from LAYOUT_VITAL_OPTIONAL_GAP — no rule is drawn.
     *
     * @param {Selection<any, any, any, any>} parent The parent element to which the elements are to be attached
     *
     * @public
     */
    appendDate(parent) {
        const table = parent.append("g").attr("class", "facts");

        // The optional block only renders when at least one user-configured
        // tag is present beyond the BIRT and DEAT placeholders.
        const showAdditionalFacts =
            this._svg._configuration.showAdditionalFacts &&
            Array.isArray(this._svg._configuration.factSlots) &&
            this._svg._configuration.factSlots.length > 2;

        // Top/Bottom and Bottom/Top
        if (this._orientation.isVertical) {
            this.appendVerticalVitalRows(table);

            if (showAdditionalFacts) {
                this.appendVerticalOptionalRows(table);
            }
            return;
        }

        // Left/Right and Right/Left
        this.appendHorizontalVitalRows(table);

        if (showAdditionalFacts) {
            this.appendHorizontalOptionalRows(table);
        }
    }

    /* -------------------- Vertical layout helpers -------------------- */

    /**
     * Y-coordinate of the first vital row in vertical layouts. Every
     * row in the box — name, optional nickname, surname, optional alt-
     * name, vital block — sits on a single 20 px grid, so each label
     * is exactly one line-step below the previous one.
     *
     * The base offset (35) covers a 2-group name (firstname + lastname)
     * with the surname at text.y + 10, plus a 25 px gap to the vital
     * block — wider than the 20 px name-line grid so the dates read as
     * a separate region from the name region (and visibly more spaced
     * than the 18 px gap between the two date rows themselves). Each
     * optional name row (nickname, alt-name) pushes the vital block
     * further down by one 20 px line-grid step.
     *
     * @returns {number}
     *
     * @private
     */
    verticalVitalBaseY() {
        const config = this._svg._configuration;
        // Surname (no nick): text.y + 10. Plus the standard
        // name-to-vital gap. Each optional name row pushes the vital
        // block one 20 px line-grid step further down.
        let offset = 10 + LAYOUT_NAME_TO_VITAL_GAP;
        if (config.nicknameVisible) {
            offset += LAYOUT_VERTICAL_NICKNAME_OFFSET;
        }
        if (config.altNameVisible) {
            offset += LAYOUT_VERTICAL_ALTNAME_OFFSET;
        }
        // Compact mode (places off) keeps the box height the same but
        // anchors the last date row where the last place row would have
        // sat — see vitalCompactShift().
        return this._text.y + offset + this.vitalCompactShift();
    }

    /**
     * Y-offset added to the vital baseY when places are toggled off, so
     * the shorter date-only block hugs the bottom of the box (where the
     * full-mode last place row would have sat) instead of leaving a wide
     * empty strip beneath the dates. Returns 0 in full mode.
     *
     * The shift equals one pair offset (32) plus one place offset (14)
     * minus the compact pair offset (18) — i.e., the height collapsed by
     * removing the two place rows.
     *
     * @returns {number}
     *
     * @private
     */
    vitalCompactShift() {
        const config = this._svg._configuration;
        // Vertical and horizontal-with-extras both shrink the box
        // when places are off, so no shift is needed — the rhythm
        // (25 px name → vital, 22.5 px alt → vital) lands the date
        // pair with the natural bottom padding.
        if (config.showPlaces || (config.optionalRows ?? 0) > 0) {
            return 0;
        }
        if (this._orientation.isVertical) {
            return 0;
        }
        // When the alt-name is visible it already occupies the slot
        // between the main name and the vital block, so there is no
        // empty space left to push the date pair into. Adding the shift
        // here would push the dates past the alt-name and either out of
        // the box or into the bottom padding.
        if (config.altNameVisible) {
            return 0;
        }
        // Horizontal compact mode keeps the image-bound minimum box
        // (100 px) — alt-name and dates fit inside that height. Push
        // the date pair partway down so it sits visually balanced
        // against the image, leaving the alt-name (when present) in
        // its centred slot above the dates.
        if (config.imageVisible) {
            return LAYOUT_ALTNAME_CENTER_GAP;
        }
        return 0;
    }

    /**
     * Y-coordinate of the first optional row in vertical layouts. Sits
     * below the worst-case vital block plus the divider gap.
     *
     * @returns {number}
     *
     * @private
     */
    verticalOptionalBaseY() {
        return this.verticalVitalBaseY() + this.vitalBlockHeight() + LAYOUT_VITAL_OPTIONAL_GAP;
    }

    /**
     * Renders the BIRT and DEAT rows (and MARR when present, e.g. inside
     * descendants-chart spouse boxes) using the stacked date/place pattern
     * in vertical layouts. Each fact contributes one date row and an
     * optional indented place row directly underneath.
     *
     * @param {Selection} parent The parent element to which the elements are to be attached
     *
     * @private
     */
    appendVerticalVitalRows(parent) {
        const config = this._svg._configuration;
        const baseY = this.verticalVitalBaseY();
        const showPlaces = config.showPlaces;
        const pairStep = showPlaces ? LAYOUT_VITAL_PAIR_OFFSET : LAYOUT_VITAL_COMPACT_PAIR_OFFSET;
        const self = this;

        parent.each(function (d) {
            const facts = self.vitalFacts(d.data.data.facts);
            const node = d3.select(this);
            let pairOffset = 0;

            facts.forEach((fact) => {
                // With places shown, dates render with a leading glyph
                // and the place stacks tightly underneath (fan-chart
                // tooltip rhythm). Without places, the glyph column
                // would sit alone next to a single value — drop it and
                // centre the date instead, both in minimal mode and
                // when optional rows are present below the dates. The
                // visual contrast (centred dates vs left-aligned
                // optionals) reads as "vital block / extras".
                const dateY = baseY + pairOffset * pairStep;

                if (showPlaces) {
                    self.appendVitalDateRow(node, glyphForTag(fact.tag), fact, dateY);

                    if (fact.place !== "") {
                        self.appendVitalPlaceRow(
                            node,
                            fact.place,
                            dateY + LAYOUT_VITAL_PLACE_OFFSET,
                        );
                    }
                } else {
                    self.appendVitalDateRowCentred(node, fact, dateY);
                }
                pairOffset += 1;
            });
        });
    }

    /**
     * Renders one vital "date" row centred horizontally inside the box,
     * without a glyph column. Used by the minimal vertical layout
     * (LAYOUT_VERTICAL_NODE_WIDTH_COMPACT) where the row carries only
     * the date string and the box is too narrow to host the glyph
     * gutter that the full layout uses.
     *
     * @param {Selection} parent The node's selection (per-individual)
     * @param {FactView}  fact   The vital fact view (date/place/value)
     * @param {number}    y      Y-coordinate for this row
     *
     * @private
     */
    appendVitalDateRowCentred(parent, fact, y) {
        const dateText = fact.date === "" ? "…" : fact.date;
        const tooltip = [fact.label, fact.date, fact.place].filter((p) => p !== "").join(" · ");
        const valueAvailable = this.verticalRowAvailable();

        const text = parent
            .append("text")
            .attr("class", "fact fact-date")
            .attr("text-anchor", "middle")
            .attr("dominant-baseline", "middle")
            .attr("x", 0)
            .attr("y", y);

        text.append("title").text(tooltip);
        text.append("tspan").text(this.truncateValue(text, dateText, valueAvailable));
    }

    /**
     * Renders one optional-fact row per populated slot in vertical
     * layouts. Empty slots reserve their vertical space (so all boxes
     * stay aligned) but render no glyph or value for that individual.
     *
     * @param {Selection} parent The parent element to which the elements are to be attached
     *
     * @private
     */
    appendVerticalOptionalRows(parent) {
        const factSlots = this._svg._configuration.factSlots;
        const optionalSlots = factSlots.slice(2);
        const baseY = this.verticalOptionalBaseY();
        const self = this;

        parent.each(function (d) {
            const facts = d.data.data.facts ?? [];
            const optionalFacts = facts.slice(2);
            const node = d3.select(this);
            const rowX = self.verticalRowStartX();

            // Populated rows pack top-down in a contiguous stack — empty
            // slots are skipped so the box does not show internal gaps.
            // The chart-wide box height is sized for the worst case so
            // sparse boxes simply have empty space at the bottom.
            let renderedRow = 0;
            optionalSlots.forEach((slotTag, index) => {
                const view = optionalFacts[index] ?? null;
                if (view === null) {
                    return;
                }
                const y = baseY + renderedRow * LAYOUT_OPTIONAL_ROW_HEIGHT;
                self.appendOptionalRow(node, slotTag, view, y, rowX);
                renderedRow += 1;
            });
        });
    }

    /* -------------------- Horizontal layout helpers -------------------- */

    /**
     * Y-coordinate of the first vital row in horizontal layouts.
     *
     * @returns {number}
     *
     * @private
     */
    horizontalVitalBaseY() {
        // Anchor the vital block to the name baseline, mirroring the
        // vertical layout. The horizontal layout has a single inline
        // name line at this._text.y + 12.5 (central baseline), so the
        // vital offset counts from that anchor.
        const config = this._svg._configuration;
        const mainNameY = this._text.y + 12.5;
        // When an alt-name is visible it sits at LAYOUT_ALTNAME_CENTER_GAP
        // below the main name, and the vital block must sit another
        // LAYOUT_ALTNAME_CENTER_GAP below the alt-name so the alt floats
        // visually centred between the two regions — independent of the
        // places toggle. When no alt-name is visible the vital block sits
        // at the standard LAYOUT_NAME_TO_VITAL_GAP below the main name.
        const baseY = config.altNameVisible
            ? mainNameY + 2 * LAYOUT_ALTNAME_CENTER_GAP
            : mainNameY + LAYOUT_NAME_TO_VITAL_GAP;

        // Compact mode (places off, no alt-name) shifts the vital block
        // down so the last date row sits where the last place row would
        // have sat — see vitalCompactShift().
        return baseY + this.vitalCompactShift();
    }

    /**
     * Y-coordinate of the first optional row in horizontal layouts.
     *
     * @returns {number}
     *
     * @private
     */
    horizontalOptionalBaseY() {
        return this.horizontalVitalBaseY() + this.vitalBlockHeight() + LAYOUT_VITAL_OPTIONAL_GAP;
    }

    /**
     * Renders the vital rows in horizontal layouts. Each fact still uses
     * the stacked date/place pattern; rows flow downward from the top of
     * the text column next to the image. textX flips the start position
     * for RTL layouts so the rows stay anchored on the correct side.
     *
     * @param {Selection} parent The parent element to which the elements are to be attached
     *
     * @private
     */
    appendHorizontalVitalRows(parent) {
        const baseY = this.horizontalVitalBaseY();
        const showPlaces = this._svg._configuration.showPlaces;
        const pairStep = showPlaces ? LAYOUT_VITAL_PAIR_OFFSET : LAYOUT_VITAL_COMPACT_PAIR_OFFSET;
        const self = this;

        parent.each(function (d) {
            const facts = self.vitalFacts(d.data.data.facts);
            const node = d3.select(this);
            const withImage = d.data.data.thumbnail !== "";
            const x = self.textX({ withImage });
            let pairOffset = 0;

            facts.forEach((fact) => {
                const glyph = glyphForTag(fact.tag);
                // Same pair rhythm as appendVerticalVitalRows.
                const dateY = baseY + pairOffset * pairStep;

                self.appendVitalDateRow(node, glyph, fact, dateY, x);

                if (showPlaces && fact.place !== "") {
                    self.appendVitalPlaceRow(
                        node,
                        fact.place,
                        dateY + LAYOUT_VITAL_PLACE_OFFSET,
                        x,
                    );
                }
                pairOffset += 1;
            });
        });
    }

    /**
     * Renders the optional rows in horizontal layouts. One row per slot,
     * stacked under the vital block in a single column so glyphs and
     * values keep the same table-grid alignment as in vertical layouts.
     *
     * @param {Selection} parent The parent element to which the elements are to be attached
     *
     * @private
     */
    appendHorizontalOptionalRows(parent) {
        const factSlots = this._svg._configuration.factSlots;
        const optionalSlots = factSlots.slice(2);
        const baseY = this.horizontalOptionalBaseY();
        const self = this;

        parent.each(function (d) {
            const facts = d.data.data.facts ?? [];
            const optionalFacts = facts.slice(2);
            const node = d3.select(this);
            const withImage = d.data.data.thumbnail !== "";
            const startX = self.textX({ withImage });
            const rowWidth = self.horizontalRowAvailable(startX);

            // Populated rows pack top-down in a contiguous stack — see
            // appendVerticalOptionalRows for the rationale.
            let renderedRow = 0;
            optionalSlots.forEach((slotTag, index) => {
                const view = optionalFacts[index] ?? null;
                if (view === null) {
                    return;
                }
                const y = baseY + renderedRow * LAYOUT_OPTIONAL_ROW_HEIGHT;
                self.appendOptionalRow(node, slotTag, view, y, startX, rowWidth);
                renderedRow += 1;
            });
        });
    }

    /* -------------------- Shared row helpers -------------------- */

    /**
     * Returns the height of the worst-case vital block: from the first
     * date row centre to the last (place or date) row centre. Used to
     * position the optional block.
     *
     * Pedigree filters MARR at the data source, so the worst case is
     * BIRT + DEAT = 2 pairs.
     *
     * Full mode: BIRT date → BIRT place is +LAYOUT_VITAL_PLACE_OFFSET (14),
     * BIRT date → DEAT date is +LAYOUT_VITAL_PAIR_OFFSET (32), and DEAT
     * date → DEAT place is another +LAYOUT_VITAL_PLACE_OFFSET. The block
     * therefore spans pair_offset + place_offset = 46 px from first date
     * to last place.
     *
     * Compact mode (places off) drops both place rows, so the block
     * reaches only the second date row at +LAYOUT_VITAL_COMPACT_PAIR_OFFSET
     * (18). The compact baseY shift in horizontalVitalBaseY compensates
     * so the absolute end-y stays the same and the optional block sits
     * at the same place across modes.
     *
     * @returns {number}
     *
     * @private
     */
    vitalBlockHeight() {
        if (!this._svg._configuration.showPlaces) {
            return LAYOUT_VITAL_COMPACT_PAIR_OFFSET;
        }
        return LAYOUT_VITAL_PAIR_OFFSET + LAYOUT_VITAL_PLACE_OFFSET;
    }

    /**
     * Returns the populated vital fact views for an individual, in the
     * order they appear in the slot list. The slot order is set by
     * FactResolver server-side and is canonical chronological
     * BIRT → MARR → DEAT.
     *
     * @param {(FactView|null)[] | undefined} facts The full slot-aligned fact array on the node
     *
     * @returns {FactView[]} Only the populated vital views; null and non-vital tags are filtered out
     *
     * @private
     */
    vitalFacts(facts) {
        if (!Array.isArray(facts)) {
            return [];
        }

        return facts.filter((fact) => fact != null && VITAL_TAGS.has(fact.tag));
    }

    /**
     * Renders one vital "date" row: glyph in the symbol column, date in
     * the value column. When the date is missing but the place is known,
     * the date cell shows "…" so the glyph still anchors the row.
     *
     * Vertical and horizontal layouts share this method — the row always
     * uses a glyph + value table column. The minimal vertical mode (no
     * places, no glyph column) goes through {@link appendVitalDateRowCentred}
     * instead.
     *
     * @param {Selection} parent   The node's selection (per-individual)
     * @param {string}    glyph    Resolved glyph for the fact's tag (★/†/⚭)
     * @param {FactView}  fact     The vital fact view (date/place/value)
     * @param {number}    y        Y-coordinate for this row
     * @param {number}    [startX] Start X for horizontal layouts; ignored
     *                             in vertical layouts where the row is
     *                             centred via verticalRowStartX
     *
     * @private
     */
    appendVitalDateRow(parent, glyph, fact, y, startX = 0) {
        const isVertical = this._orientation.isVertical;
        const dateText = fact.date === "" ? "…" : fact.date;
        const tooltip = [fact.label, fact.date, fact.place].filter((p) => p !== "").join(" · ");
        // All rows align on a fixed left edge so the glyph column stays in
        // line. The value column starts LAYOUT_GLYPH_COL_WIDTH past it so
        // glyphs and values render as a true two-column table regardless
        // of the glyph's own visual width.
        const x = isVertical ? this.verticalRowStartX() : startX;
        const valueX = x + LAYOUT_GLYPH_COL_WIDTH;
        const rowWidth = isVertical
            ? this.verticalRowAvailable()
            : this.horizontalRowAvailable(startX);
        const valueAvailable = rowWidth - LAYOUT_GLYPH_COL_WIDTH;

        this.appendGlyph(parent, glyph, x, y);

        const valueText = parent
            .append("text")
            .attr("class", "fact fact-date")
            .attr("text-anchor", "start")
            .attr("dominant-baseline", "middle")
            .attr("x", valueX)
            .attr("y", y);

        valueText.append("title").text(tooltip);
        valueText.append("tspan").text(this.truncateValue(valueText, dateText, valueAvailable));
    }

    /**
     * Renders one vital "place" row: no glyph, place text only. In
     * horizontal layouts the row is indented past the glyph column so it
     * aligns visually under the date value.
     *
     * @param {Selection} parent   The node's selection (per-individual)
     * @param {string}    place    The place string (already non-empty)
     * @param {number}    y        Y-coordinate for this row
     * @param {number}    [startX] Start X for horizontal layouts; ignored
     *                             in vertical layouts
     *
     * @private
     */
    appendVitalPlaceRow(parent, place, y, startX = 0) {
        const isVertical = this._orientation.isVertical;
        // Place row sits in the value column under the date value (no
        // glyph), aligned with the rest of the table's right column.
        const x = (isVertical ? this.verticalRowStartX() : startX) + LAYOUT_GLYPH_COL_WIDTH;
        const rowWidth = isVertical
            ? this.verticalRowAvailable()
            : this.horizontalRowAvailable(startX);
        const available = rowWidth - LAYOUT_GLYPH_COL_WIDTH;

        const text = parent
            .append("text")
            .attr("class", "fact fact-place")
            .attr("text-anchor", "start")
            .attr("dominant-baseline", "middle")
            .attr("x", x)
            .attr("y", y);

        text.append("title").text(place);
        text.append("tspan").text(this.truncateValue(text, place, available));
    }

    /**
     * Renders one optional row: glyph + value. Empty slots render nothing —
     * populated rows in {@see appendVerticalOptionalRows} pack top-down
     * in a contiguous stack while the chart-wide box height is sized for
     * the worst case so all boxes still share the same bounding rect.
     * Tooltip via <title> carries the full label and value so the meaning
     * is recoverable for screen readers and on hover.
     *
     * @param {Selection}     parent  The node's selection (per-individual)
     * @param {string}        slotTag GEDCOM tag for this slot (drives the glyph)
     * @param {FactView|null} view    The fact view, or null when this slot is empty for the individual
     * @param {number}        y       Y-coordinate for this row
     * @param {number}        x       X-coordinate of the row's left edge (glyph column)
     * @param {number}        [width] Available width for truncation; defaults to the full text-column width
     *
     * @private
     */
    appendOptionalRow(parent, slotTag, view, y, x, width) {
        // Empty slots render nothing — the row's vertical space is still
        // reserved at the chart-wide level so all boxes share the same
        // bounding rect, but no glyph or em-dash is drawn.
        if (view === null) {
            return;
        }

        const glyph = glyphForTag(slotTag);
        const value = this.formatOptionalValue(view);
        const tooltip = [view.label, view.date, view.place, view.value]
            .filter((p) => p !== "")
            .join(" · ");
        const rowWidth = typeof width === "number" ? width : this.verticalRowAvailable();
        const valueX = x + LAYOUT_GLYPH_COL_WIDTH;
        const valueAvailable = rowWidth - LAYOUT_GLYPH_COL_WIDTH;

        this.appendGlyph(parent, glyph, x, y);

        const text = parent
            .append("text")
            .attr("class", "fact fact-optional")
            .attr("text-anchor", "start")
            .attr("dominant-baseline", "middle")
            .attr("x", valueX)
            .attr("y", y);

        text.append("title").text(tooltip);
        text.append("tspan").text(this.truncateValue(text, value, valueAvailable));
    }

    /**
     * Renders a single glyph in the row's left column. Used by both vital
     * and optional rows so glyphs (★/†/⚭/⚒/✎/…) align on one fixed
     * vertical axis like a table column.
     *
     * @param {Selection} parent The node's selection (per-individual)
     * @param {string}    glyph  Single-codepoint glyph
     * @param {number}    x      X-coordinate of the glyph column's left edge
     * @param {number}    y      Y-coordinate for this row
     *
     * @private
     */
    appendGlyph(parent, glyph, x, y) {
        // Centre the glyph inside its column so symbols of varying widths
        // (★ vs ¶ vs ⚖) sit on the same vertical axis as their neighbours.
        parent
            .append("text")
            .attr("class", "fact fact-glyph")
            .attr("text-anchor", "middle")
            .attr("dominant-baseline", "middle")
            .attr("x", x + LAYOUT_GLYPH_COL_WIDTH / 2)
            .attr("y", y)
            .text(glyph);
    }

    /**
     * Formats one optional fact's value cell. Prefers the GEDCOM value,
     * falls back to place, then date — covers tags like OCCU (carries a
     * value), RESI (carries a place), and date-only events.
     *
     * @param {FactView} view The fact view (already non-null)
     *
     * @returns {string} The chosen non-empty cell text
     *
     * @private
     */
    formatOptionalValue(view) {
        return view.value === "" ? (view.place === "" ? view.date : view.place) : view.value;
    }

    /**
     * Left edge for vertical-layout rows. All rows (vital and optional)
     * align on this edge so the glyph column stays in line regardless of
     * which fact populates a given row.
     *
     * @returns {number}
     *
     * @private
     */
    verticalRowStartX() {
        return -this._text.width / 2;
    }

    /**
     * Available row width inside a vertical-layout box.
     *
     * @returns {number}
     *
     * @private
     */
    verticalRowAvailable() {
        return this._text.width;
    }

    /**
     * Available text width for a horizontal row starting at startX. Used
     * by truncation so long places and values fit inside the box.
     *
     * In LTR rows grow rightward from startX toward the column's right
     * edge at +(text.x + text.width). In RTL the document is mirrored,
     * startX is negative, and rows grow leftward toward the column's
     * left edge at -(text.x + text.width); the available distance is
     * still positive (startX − leftEdge).
     *
     * @param {number} startX Row's start x-coordinate (text-anchor side)
     *
     * @returns {number} Pixels available from startX to the column's far edge
     *
     * @private
     */
    horizontalRowAvailable(startX) {
        const columnExtent = this._text.x + this._text.width;
        return this._orientation.isDocumentRtl ? startX + columnExtent : columnExtent - startX;
    }

    /**
     * Truncates the value to fit the available width with an ellipsis
     * suffix when the original would overflow. Trailing dots are stripped
     * before appending the ellipsis to avoid visual stutter ("Foo….").
     *
     * @param {Selection} parent         The text element used for font-metrics measurement
     * @param {string}    value          The value to (potentially) truncate
     * @param {number}    availableWidth The total available width the text could take
     *
     * @returns {string} The original value, or a truncated form ending in "…"
     *
     * @private
     */
    truncateValue(parent, value, availableWidth) {
        const fontSize = parent.style("font-size");
        const fontWeight = Number.parseInt(parent.style("font-weight"), 10) || 400;

        // Fast path: full string already fits, no ellipsis needed.
        if (this.measureText(value, fontSize, fontWeight) <= availableWidth) {
            return value;
        }

        // Shrink against availableWidth minus the ellipsis width — otherwise
        // the appended "…" can push the rendered string past the box edge.
        const ellipsisWidth = this.measureText("…", fontSize, fontWeight);
        const target = availableWidth - ellipsisWidth;

        let working = value;
        while (working.length > 1 && this.measureText(working, fontSize, fontWeight) > target) {
            working = working.slice(0, -1).trim();
        }

        if (working[working.length - 1] === ".") {
            working = working.slice(0, -1).trim();
        }

        return `${working}…`;
    }

    /**
     * X-coordinate for text rows in horizontal layouts.
     *
     * @param {{withImage: boolean}} d Whether the row sits next to an image (offset by the image width)
     *
     * @returns {number}
     *
     * @private
     */
    textX(d) {
        const xPos = this._text.x + (d.withImage ? this._image.width : 0);

        // Reverse direction of text elements for RTL layouts
        return this._orientation.isDocumentRtl ? -xPos : xPos;
    }

    /**
     * Measures the given text and return its width depending on the used font (including size and weight).
     *
     * @param {string} text       The text to measure
     * @param {string} fontSize   CSS font-size value as resolved on the parent text element
     * @param {number} fontWeight CSS font-weight as a numeric value
     *
     * @returns {number} Measured width in pixels
     *
     * @private
     */
    measureText(text, fontSize, fontWeight = 400) {
        const fontFamily = this._svg.style("font-family");

        return measureText(text, fontFamily, fontSize, fontWeight);
    }
}
