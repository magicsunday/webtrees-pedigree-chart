/**
 * This file is part of the package magicsunday/webtrees-pedigree-chart.
 *
 * For the full copyright and license information, please read the
 * LICENSE file distributed with this source code.
 */

/**
 * Baseline node width for each tree layout. Heights are computed at runtime
 * by hierarchy.js based on the active mode (additional-facts toggle), the
 * chart-wide worst-case vital-row count, and the optional fact-slot count.
 *
 * @type {number}
 * @const
 */
export const LAYOUT_HORIZONTAL_NODE_WIDTH = 380;
export const LAYOUT_VERTICAL_NODE_WIDTH = 260;

/**
 * Compact-mode heights — image + name + worst-case vital block. The runtime
 * adds the optional-block extension on top of these when the per-chart
 * "Show additional facts" toggle is on. Worst-case vital block for pedigree
 * is BIRT date + BIRT place + DEAT date + DEAT place (4 rows). MARR is
 * filtered at the data source for ancestor charts.
 *
 * @type {number}
 * @const
 */
export const LAYOUT_HORIZONTAL_NODE_BASE_HEIGHT = 100;
export const LAYOUT_VERTICAL_NODE_BASE_HEIGHT = 222;

/**
 * Vertical-layout space reserved for the portrait strip (image height +
 * padding above and below). Subtracted from the compact base height when
 * no individual in the chart has an image — see Hierarchy.init().
 *
 * @type {number}
 * @const
 */
export const LAYOUT_VERTICAL_IMAGE_SPACE = 98;

/**
 * Extra height reserved for the alt-name line in horizontal layouts.
 * Vital baseY moves from image.y + 33 (no alt, bottom-anchored to image)
 * to image.y + 50 (alt visible, sits one row below alt-name with the
 * same name-to-vital gap as the no-alt case) — a 17 px shift, which
 * the box height needs to grow by to keep bottom padding symmetric.
 *
 * @type {number}
 * @const
 */
export const LAYOUT_HORIZONTAL_ALT_OFFSET = 17;

/**
 * Extra height reserved for the nickname row when the chart has at least
 * one nickname. One additional 20 px name line under the given names.
 *
 * @type {number}
 * @const
 */
export const LAYOUT_VERTICAL_NICKNAME_OFFSET = 20;

/**
 * Extra height reserved for the alternative-name line when the chart has
 * at least one alternative name. The alt-name sits 25 px below the
 * surname (one line plus a small extra gap so it reads as a separate
 * label) — the same gap is used between the alt-name and the vital block.
 *
 * @type {number}
 * @const
 */
export const LAYOUT_VERTICAL_ALTNAME_OFFSET = 25;

/**
 * Vertical distance between the start of one vital pair and the start of
 * the next (BIRT pair → DEAT pair). Sized to match the natural line
 * spacing of the fan-chart tooltip: a 14 px date line plus a 12 px italic
 * place line stack to roughly this height.
 *
 * @type {number}
 * @const
 */
export const LAYOUT_VITAL_PAIR_OFFSET = 32;

/**
 * Legacy alias preserved for code paths that still reserve space using
 * the previous "fact row height" abstraction. New code should prefer
 * {@link LAYOUT_VITAL_PAIR_OFFSET} (vital pair) or
 * {@link LAYOUT_OPTIONAL_ROW_HEIGHT} (optional rows).
 *
 * @type {number}
 * @const
 */
export const LAYOUT_FACT_ROW_HEIGHT = 20;

/**
 * Vertical spacing between optional fact rows. Tighter than the vital
 * row grid because optional rows have no place sub-row underneath them
 * — the value is small enough to feel like a single dense list.
 *
 * @type {number}
 * @const
 */
export const LAYOUT_OPTIONAL_ROW_HEIGHT = 16;

/**
 * Vertical offset of the place row below its date row inside a vital
 * pair, matching the tighter line spacing used by the fan-chart tooltip
 * (where the place td sits right under the date td with no extra row
 * padding). The next vital pair still starts on the regular row grid,
 * so the visual rhythm is "tight pair, gap, tight pair, gap".
 *
 * @type {number}
 * @const
 */
export const LAYOUT_VITAL_PLACE_OFFSET = 14;

/**
 * Pair offset between date rows in the compact (places-off) layout.
 * Equals LAYOUT_VITAL_PAIR_OFFSET − LAYOUT_VITAL_PLACE_OFFSET (32 − 14 = 18) —
 * the gap between the place row of one pair and the date row of the next
 * in full mode, reused as the date-to-date gap when the place rows are
 * removed.
 *
 * @type {number}
 * @const
 */
export const LAYOUT_VITAL_COMPACT_PAIR_OFFSET = 18;

/**
 * Extra gap between the vital block and the optional block in the box. Sits
 * around the hairline rule that separates the biographical spine from the
 * configurable extras.
 *
 * @type {number}
 * @const
 */
export const LAYOUT_VITAL_OPTIONAL_GAP = 24;

/**
 * Width reserved for the glyph column inside each fact row. Both vital
 * and optional rows share this column so glyphs (★/†/⚭/⚒/✎/…) align
 * on a single vertical axis like a table column. The value column starts
 * at LAYOUT_GLYPH_COL_WIDTH past the row's left edge.
 *
 * @type {number}
 * @const
 */
export const LAYOUT_GLYPH_COL_WIDTH = 18;

/**
 * Sparse-data caption threshold. When at least this many optional slots are
 * empty for an individual, the optional grid collapses to a single italic
 * "no further data" caption instead of rendering N em-dashes.
 *
 * @type {number}
 * @const
 */
export const SPARSE_CAPTION_THRESHOLD = 3;

// Variation selector U+FE0E appended to each glyph so the browser picks
// the monochrome text presentation rather than a colour-emoji form. Some
// fonts default to coloured glyphs for codepoints like ★ and ✎; this
// tag forces them onto the tertiary text colour we want for the fact
// glyph column.
const TEXT_PRESENTATION = "︎";

/**
 * Glyph map for the fact-row icon column. Single-codepoint Unicode
 * characters in monochrome text presentation. The glyphs render in
 * tertiary colour (currentColor) on tinted box backgrounds.
 *
 * @type {Object<string, string>}
 * @const
 */
export const FACT_GLYPHS = {
    BIRT: `★${TEXT_PRESENTATION}`,
    CHR: `✝${TEXT_PRESENTATION}`,
    BAPM: `✝${TEXT_PRESENTATION}`,
    DEAT: `†${TEXT_PRESENTATION}`,
    BURI: `⚱${TEXT_PRESENTATION}`,
    CREM: `⚱${TEXT_PRESENTATION}`,
    MARR: `⚭${TEXT_PRESENTATION}`,
    OCCU: `⚒${TEXT_PRESENTATION}`,
    EDUC: `✎${TEXT_PRESENTATION}`,
    RESI: `⌂${TEXT_PRESENTATION}`,
    RELI: `☩${TEXT_PRESENTATION}`,
    CENS: `☷${TEXT_PRESENTATION}`,
    NOTE: `¶${TEXT_PRESENTATION}`,
    WILL: `⚖${TEXT_PRESENTATION}`,
};

/**
 * Fallback glyph for any GEDCOM tag not present in {@link FACT_GLYPHS}.
 *
 * @type {string}
 * @const
 */
export const FACT_GLYPH_FALLBACK = `▸${TEXT_PRESENTATION}`;

/**
 * Returns the glyph for a GEDCOM tag, with the neutral fallback used for
 * unknown / user-added tags.
 *
 * @param {string} tag GEDCOM tag (e.g. "BIRT", "OCCU")
 *
 * @returns {string}
 */
export function glyphForTag(tag) {
    return FACT_GLYPHS[tag] ?? FACT_GLYPH_FALLBACK;
}

/**
 * Tree layout variants.
 *
 * @type {string}
 * @const
 *
 * @see PHP class Fisharebest/Webtrees/Module/PedigreeChartModule
 */
export const LAYOUT_TOPBOTTOM = "down";
export const LAYOUT_BOTTOMTOP = "up";
export const LAYOUT_LEFTRIGHT = "right";
export const LAYOUT_RIGHTLEFT = "left";

/**
 * Gender types.
 *
 * @type {string}
 * @const
 */
export const SEX_MALE = "M";
export const SEX_FEMALE = "F";
