/**
 * This file is part of the package magicsunday/webtrees-pedigree-chart.
 *
 * For the full copyright and license information, please read the
 * LICENSE file distributed with this source code.
 */

import Configuration from "../modules/configuration.js";

const labels = { zoom: "Zoom", move: "Move" };

/**
 * @param {boolean} showPlaces
 * @param {boolean} showAdditionalFacts
 * @param {number}  optionalRows
 *
 * @return {Configuration}
 */
function create(showPlaces, showAdditionalFacts, optionalRows) {
    return new Configuration(
        labels,
        "right",
        true,
        true,
        false,
        "#70a9cf",
        "#d06f94",
        "GIVEN",
        false,
        showPlaces,
        showAdditionalFacts,
        optionalRows,
    );
}

describe("Configuration fact rows", () => {
    test("shows no fact rows by default", () => {
        const configuration = new Configuration(labels);

        expect(configuration.showPlaces).toBe(false);
        expect(configuration.showFactRows).toBe(false);
        expect(configuration.factLayout).toBeNull();
    });

    test("shows the place rows alone", () => {
        const configuration = create(true, false, 3);

        expect(configuration.showOptionalRows).toBe(false);
        expect(configuration.factLayout).toEqual({ showPlaces: true, optionalRows: 0 });
    });

    test("shows the optional rows alone", () => {
        const configuration = create(false, true, 2);

        expect(configuration.showOptionalRows).toBe(true);
        expect(configuration.factLayout).toEqual({ showPlaces: false, optionalRows: 2 });
    });

    test("ignores the additional facts switch when the tree has no optional tag", () => {
        const configuration = create(false, true, 0);

        expect(configuration.showOptionalRows).toBe(false);
        expect(configuration.showFactRows).toBe(false);
        expect(configuration.factLayout).toBeNull();
    });
});
