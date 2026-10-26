/**
 * This file is part of the package magicsunday/webtrees-pedigree-chart.
 *
 * For the full copyright and license information, please read the
 * LICENSE file distributed with this source code.
 */

import Configuration from "resources/js/modules/configuration.js";
import Hierarchy from "resources/js/modules/hierarchy.js";
import { factRowsExtent } from "@magicsunday/webtrees-chart-lib/linked-tree";

const LABELS = { zoom: "Zoom", move: "Move" };
const DATUM = { parents: [] };

/**
 * Builds the configuration of a chart and lays its hierarchy out once.
 *
 * @param {string}  layout
 * @param {object}  options
 * @param {boolean} options.alternativeName
 * @param {boolean} options.places
 * @param {boolean} options.additionalFacts
 * @param {number}  options.optionalRows
 *
 * @return {Configuration}
 */
function layOut(layout, options) {
    const configuration = new Configuration(
        LABELS,
        layout,
        true,
        options.alternativeName,
        false,
        "#70a9cf",
        "#d06f94",
        "GIVEN",
        false,
        options.places,
        options.additionalFacts,
        options.optionalRows,
    );

    new Hierarchy(configuration).init(DATUM);

    return configuration;
}

describe("Hierarchy.init box size", () => {
    test("a vertical box without fact rows only grows for the alternative name", () => {
        const { orientation } = layOut("down", {
            alternativeName: true,
            places: false,
            additionalFacts: false,
            optionalRows: 0,
        });

        expect([orientation.boxWidth, orientation.boxHeight]).toEqual([160, 205]);
    });

    test("a vertical box with fact rows is wider and grows by the rows of the fullest box", () => {
        const { orientation } = layOut("down", {
            alternativeName: false,
            places: true,
            additionalFacts: true,
            optionalRows: 2,
        });

        expect(orientation.boxWidth).toBe(240);
        expect(orientation.boxHeight).toBe(
            175 + factRowsExtent({ showPlaces: true, optionalRows: 2 }),
        );
    });

    test("a horizontal box grows symmetrically around the first date row", () => {
        const { orientation } = layOut("right", {
            alternativeName: true,
            places: true,
            additionalFacts: true,
            optionalRows: 2,
        });

        expect([orientation.boxWidth, orientation.boxHeight]).toEqual([325, 225]);
    });

    test("a second layout of the same chart does not grow the boxes again", () => {
        const configuration = layOut("down", {
            alternativeName: true,
            places: true,
            additionalFacts: true,
            optionalRows: 2,
        });
        const { orientation } = configuration;
        const first = [orientation.boxWidth, orientation.boxHeight];

        new Hierarchy(configuration).init(DATUM);

        expect([orientation.boxWidth, orientation.boxHeight]).toEqual(first);
    });

    test("the optional rows count for nothing when the switch for them is off", () => {
        const { orientation } = layOut("down", {
            alternativeName: false,
            places: true,
            additionalFacts: false,
            optionalRows: 5,
        });

        expect(orientation.boxHeight).toBe(
            175 + factRowsExtent({ showPlaces: true, optionalRows: 0 }),
        );
    });
});
