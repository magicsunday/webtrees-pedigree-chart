/**
 * This file is part of the package magicsunday/webtrees-pedigree-chart.
 *
 * For the full copyright and license information, please read the
 * LICENSE file distributed with this source code.
 */

import { boxSize } from "../modules/box-size.js";
import { factRowsExtent } from "@magicsunday/webtrees-chart-lib/linked-tree";

describe("boxSize", () => {
    test("keeps the default vertical box without fact rows", () => {
        expect(boxSize({ vertical: true, showAlternativeName: false, facts: null })).toEqual({
            width: 160,
            height: 175,
        });
    });

    test("keeps the default horizontal box without fact rows", () => {
        expect(boxSize({ vertical: false, showAlternativeName: true, facts: null })).toEqual({
            width: 325,
            height: 95,
        });
    });

    test("adds the alternative name row to the vertical box only", () => {
        expect(boxSize({ vertical: true, showAlternativeName: true, facts: null }).height).toBe(
            205,
        );
    });

    test("is the same on every call, so a second layout pass does not grow the box", () => {
        const options = { vertical: true, showAlternativeName: true, facts: null };

        expect(boxSize(options)).toEqual(boxSize(options));
    });

    test("grows a vertical box by the extent of the fact rows and widens it", () => {
        const facts = { showPlaces: true, optionalRows: 2 };
        const extent = factRowsExtent(facts);

        expect(boxSize({ vertical: true, showAlternativeName: false, facts })).toEqual({
            width: 240,
            height: 175 + extent,
        });
        expect(boxSize({ vertical: true, showAlternativeName: true, facts }).height).toBe(
            175 + 30 + extent,
        );
    });

    test("grows a horizontal box symmetrically around the centre", () => {
        const facts = { showPlaces: true, optionalRows: 3 };

        expect(factRowsExtent(facts)).toBe(102);
        expect(boxSize({ vertical: false, showAlternativeName: true, facts })).toEqual({
            width: 325,
            height: 257,
        });
    });

    test("never shrinks a horizontal box below its default height", () => {
        const facts = { showPlaces: false, optionalRows: 0 };

        expect(boxSize({ vertical: false, showAlternativeName: false, facts }).height).toBe(95);
    });
});
