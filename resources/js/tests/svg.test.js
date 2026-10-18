/**
 * This file is part of the package magicsunday/webtrees-pedigree-chart.
 *
 * For the full copyright and license information, please read the
 * LICENSE file distributed with this source code.
 */

import { jest } from "@jest/globals";

const exportHandler = { svgToImage: jest.fn() };
const createChartExport = jest.fn(() => exportHandler);

await jest.unstable_mockModule("@magicsunday/webtrees-chart-lib/infra", () => ({
    ChartZoom: jest.fn(),
    SvgDefs: jest.fn(() => ({ get: jest.fn(() => ({})) })),
    createChartExport,
}));

const { default: Svg } = await import("resources/js/modules/chart/svg.js");

/**
 * Builds a chainable stand-in for the D3 selection the constructor appends the
 * <svg> element to.
 */
function createParent() {
    const element = {};
    element.attr = jest.fn(() => element);

    return { append: jest.fn(() => element) };
}

describe("Svg.export", () => {
    beforeEach(() => {
        createChartExport.mockClear();
    });

    test.each(["png", "svg"])("hands the %s type to createChartExport", (type) => {
        const svg = new Svg(createParent(), {});

        expect(svg.export(type)).toBe(exportHandler);
        expect(createChartExport).toHaveBeenCalledTimes(1);
        expect(createChartExport).toHaveBeenCalledWith(type);
    });
});
