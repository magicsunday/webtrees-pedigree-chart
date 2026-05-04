/**
 * This file is part of the package magicsunday/webtrees-pedigree-chart.
 *
 * For the full copyright and license information, please read the
 * LICENSE file distributed with this source code.
 */

// Smoke tests for the curated GEDCOM-tag → glyph map. Guards against
// accidental glyph drift (e.g. swapping ★ for an emoji codepoint) and
// the neutral fallback for tags an admin added that we have not curated.

import { FACT_GLYPHS, FACT_GLYPH_FALLBACK, glyphForTag } from "../modules/constants.js";

describe("glyphForTag()", () => {
    test("returns the curated glyph for vital tags", () => {
        expect(glyphForTag("BIRT")).toBe(FACT_GLYPHS.BIRT);
        expect(glyphForTag("DEAT")).toBe(FACT_GLYPHS.DEAT);
        expect(glyphForTag("MARR")).toBe(FACT_GLYPHS.MARR);
    });

    test("returns the curated glyph for common optional tags", () => {
        expect(glyphForTag("OCCU")).toBe(FACT_GLYPHS.OCCU);
        expect(glyphForTag("EDUC")).toBe(FACT_GLYPHS.EDUC);
        expect(glyphForTag("RESI")).toBe(FACT_GLYPHS.RESI);
        expect(glyphForTag("RELI")).toBe(FACT_GLYPHS.RELI);
        expect(glyphForTag("CENS")).toBe(FACT_GLYPHS.CENS);
        expect(glyphForTag("NOTE")).toBe(FACT_GLYPHS.NOTE);
        expect(glyphForTag("WILL")).toBe(FACT_GLYPHS.WILL);
    });

    test("BIRT and DEAT use star and dagger respectively", () => {
        // These two glyphs are also used inline in fan-chart tooltips and
        // the SVG export — a regression here would break visual continuity
        // across modules.
        expect(FACT_GLYPHS.BIRT.startsWith("★")).toBe(true); // ★
        expect(FACT_GLYPHS.DEAT.startsWith("†")).toBe(true); // †
        expect(FACT_GLYPHS.MARR.startsWith("⚭")).toBe(true); // ⚭
    });

    test("each glyph carries the U+FE0E text variation selector", () => {
        // Forces monochrome text presentation in browsers that would
        // otherwise default to a colour-emoji form for codepoints like ★.
        for (const glyph of Object.values(FACT_GLYPHS)) {
            expect(glyph.includes("︎")).toBe(true);
        }
        expect(FACT_GLYPH_FALLBACK.includes("︎")).toBe(true);
    });

    test("returns the neutral fallback for unknown / user-added tags", () => {
        expect(glyphForTag("_TODO")).toBe(FACT_GLYPH_FALLBACK);
        expect(glyphForTag("REFN")).toBe(FACT_GLYPH_FALLBACK);
        expect(glyphForTag("")).toBe(FACT_GLYPH_FALLBACK);
        expect(glyphForTag("definitely-not-a-real-tag")).toBe(FACT_GLYPH_FALLBACK);
    });
});
