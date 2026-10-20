/**
 * This file is part of the package magicsunday/webtrees-pedigree-chart.
 *
 * For the full copyright and license information, please read the
 * LICENSE file distributed with this source code.
 */

import { jest } from "@jest/globals";

const { default: Chart } = await import("resources/js/modules/chart.js");

/**
 * Runs updateViewBox() against stand-ins for the SVG host and the parent
 * container and returns the viewBox attribute that was set.
 *
 * @param {{width: number, height: number, x: number, y: number}} chartBox  Bounding box of the drawn chart
 * @param {{width: number, height: number}}                       clientBox Bounding box of the parent element
 *
 * @returns {number[]}
 */
function computeViewBox(chartBox, clientBox) {
    const attributes = {};
    const svg = {
        attr: jest.fn((name, value) => {
            attributes[name] = value;

            return svg;
        }),
        visual: { node: () => ({ getBBox: () => chartBox }) },
    };
    const context = {
        svg,
        parent: { node: () => ({ getBoundingClientRect: () => clientBox }) },
        convertRemToPixels: () => 0,
    };

    Chart.prototype.updateViewBox.call(context);

    return attributes.viewBox;
}

describe("Chart.updateViewBox", () => {
    test("centres a small chart inside a larger parent", () => {
        const viewBox = computeViewBox(
            { width: 100, height: 40, x: 0, y: 0 },
            { width: 300, height: 200 },
        );

        expect(viewBox).toEqual([-100, -80, 300, 200]);
    });

    test("keeps the centring offset correct beyond the int32 range", () => {
        // A bitwise shift would wrap this difference to a negative number
        const huge = 2 ** 33;
        const viewBox = computeViewBox(
            { width: 100, height: 100, x: 0, y: 0 },
            { width: huge, height: huge },
        );

        expect(viewBox[0]).toBe(Math.ceil(-(huge - 100) / 2));
        expect(viewBox[1]).toBe(Math.ceil(-(huge - 100) / 2));
    });
});
