/**
 * This file is part of the package magicsunday/webtrees-pedigree-chart.
 *
 * For the full copyright and license information, please read the
 * LICENSE file distributed with this source code.
 */

// Tests for FactsRenderer.vitalFacts(): the filter that decides which
// of the slot-aligned per-individual facts render as a vital row.
// Must mirror the BIRTH_EVENTS / DEATH_EVENTS expansion that
// webtrees-module-base FactResolver uses on the server side, otherwise
// individuals whose vital event is recorded as christening, baptism,
// burial or cremation render an empty vital block.

import FactsRenderer from "../modules/tree/facts.js";

function fact(tag, date = "") {
    return { tag, label: tag, date, place: "", value: "" };
}

function makeRenderer() {
    // vitalFacts() reads no constructor state — bypass the constructor so
    // tests don't need svg / orientation / image / text stubs.
    return Object.create(FactsRenderer.prototype);
}

describe("FactsRenderer.vitalFacts()", () => {
    test("keeps the canonical BIRT / DEAT / MARR slots", () => {
        const facts = [fact("BIRT", "1900"), fact("MARR", "1925"), fact("DEAT", "1970")];
        expect(
            makeRenderer()
                .vitalFacts(facts)
                .map((f) => f.tag),
        ).toEqual(["BIRT", "MARR", "DEAT"]);
    });

    test("keeps CHR and BAPM as substitutes for BIRT", () => {
        // Older European GEDCOMs often record only the christening or
        // baptism, with no birth event. FactResolver returns the actual
        // tag in the BIRT slot, and the renderer must accept it.
        expect(makeRenderer().vitalFacts([fact("CHR", "1700")])).toEqual([fact("CHR", "1700")]);
        expect(makeRenderer().vitalFacts([fact("BAPM", "1700")])).toEqual([fact("BAPM", "1700")]);
    });

    test("keeps BURI and CREM as substitutes for DEAT", () => {
        // Same pattern as BIRT/CHR/BAPM: the GEDCOM may carry only a
        // burial or cremation event, and the renderer must render it.
        expect(makeRenderer().vitalFacts([fact("BURI", "1780")])).toEqual([fact("BURI", "1780")]);
        expect(makeRenderer().vitalFacts([fact("CREM", "1780")])).toEqual([fact("CREM", "1780")]);
    });

    test("drops null and undefined slots without crashing", () => {
        expect(makeRenderer().vitalFacts([null, fact("BIRT"), undefined])).toEqual([fact("BIRT")]);
    });

    test("drops non-vital tags (optional fact slots leak in)", () => {
        // The slot-aligned fact array contains the optional rows after
        // the two vital slots; vitalFacts must filter them out so the
        // vital block only renders BIRT/DEAT/MARR-equivalents.
        const facts = [fact("BIRT"), fact("OCCU"), fact("RESI"), fact("DEAT")];
        expect(
            makeRenderer()
                .vitalFacts(facts)
                .map((f) => f.tag),
        ).toEqual(["BIRT", "DEAT"]);
    });

    test("returns an empty array for non-array input", () => {
        expect(makeRenderer().vitalFacts(undefined)).toEqual([]);
        expect(makeRenderer().vitalFacts(null)).toEqual([]);
    });
});
