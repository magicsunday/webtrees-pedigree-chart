/**
 * This file is part of the package magicsunday/webtrees-pedigree-chart.
 *
 * For the full copyright and license information, please read the
 * LICENSE file distributed with this source code.
 */

import Name from "resources/js/modules/lib/tree/name.js";

/**
 * Builds a Name instance whose measureText() is deterministic
 * (each character costs 10 pixels) so truncateNames() can be exercised
 * without a real chart-lib measurement.
 */
function makeName() {
    const name = Object.create(Name.prototype);
    name.measureText = (text) => text.length * 10;
    return name;
}

describe("Name.truncateNames", () => {
    it("returns the input unchanged when the line fits", () => {
        const name = makeName();
        const names = [
            { label: "Anna",     isPreferred: false, isLastName: false, isNameRtl: false },
            { label: "Schmidt",  isPreferred: false, isLastName: true,  isNameRtl: false },
        ];

        // "Anna Schmidt" = 12 chars * 10 = 120px; allow 1000px.
        const result = name.truncateNames(names, "12px", 400, 1000);

        expect(result.map(n => n.label)).toEqual(["Anna", "Schmidt"]);
    });

    it("truncates last names to first letter when the line is too narrow", () => {
        const name = makeName();
        const names = [
            { label: "Anna",     isPreferred: true,  isLastName: false, isNameRtl: false },
            { label: "Schmidt",  isPreferred: false, isLastName: true,  isNameRtl: false },
        ];

        // Force truncation. With only the last-name pass having work to do (Anna is preferred,
        // so it survives the first pass) Schmidt should be cut to "S.".
        const result = name.truncateNames(names, "12px", 400, 60);

        const schmidt = result.find(n => n.isLastName);
        expect(schmidt.label).toBe("S.");
    });
});
