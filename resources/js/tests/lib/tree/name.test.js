/**
 * This file is part of the package magicsunday/webtrees-pedigree-chart.
 *
 * For the full copyright and license information, please read the
 * LICENSE file distributed with this source code.
 */

import { jest } from "@jest/globals";

// chart-lib's truncateNames is mocked here so the pedigree-chart unit tests
// can verify the wiring (right call signature, right strategy) without
// double-testing the algorithm — chart-lib has its own jest suite for that.
const truncateNamesMock = jest.fn((names, _availableWidth, measureFn) => {
    measureFn(names.map((n) => n.label).join(" "));
    return names.map((n) => ({ ...n, label: `${n.label.slice(0, 1)}.` }));
});

await jest.unstable_mockModule("@magicsunday/webtrees-chart-lib", () => ({
    measureText: jest.fn(() => 0),
    truncateNames: truncateNamesMock,
}));

const { default: Name } = await import("resources/js/modules/lib/tree/name.js");

/**
 * Builds a Name instance with the minimal collaborator stubs needed to
 * exercise truncateNamesData. measureText is replaced with a deterministic
 * stub (each character costs 10 pixels) so the assertions stay stable.
 */
function makeName(nameAbbreviation = "GIVEN") {
    const name = Object.create(Name.prototype);
    name._svg = { _configuration: { nameAbbreviation } };
    name.measureText = (text) => text.length * 10;
    return name;
}

const buildParent = () => ({
    style: jest.fn((property) => (property === "font-size" ? "12px" : "400")),
});

describe("Name.truncateNamesData", () => {
    beforeEach(() => {
        truncateNamesMock.mockClear();
    });

    it("delegates to chart-lib truncateNames with the GIVEN strategy by default", () => {
        const name = makeName("GIVEN");
        const names = [
            { label: "Anna", isPreferred: false, isLastName: false, isNameRtl: false },
            { label: "Schmidt", isPreferred: false, isLastName: true, isNameRtl: false },
        ];
        const parent = buildParent();

        name.truncateNamesData(parent, names, 100);

        expect(truncateNamesMock).toHaveBeenCalledWith(
            names,
            100,
            expect.any(Function),
            expect.objectContaining({ strategy: "GIVEN" }),
        );
        expect(parent.style).toHaveBeenCalledWith("font-size");
        expect(parent.style).toHaveBeenCalledWith("font-weight");
    });

    it("passes the SURNAME strategy when configured", () => {
        const name = makeName("SURNAME");
        const names = [
            { label: "Jón", isPreferred: true, isLastName: false, isNameRtl: false },
            { label: "Sigurðsson", isPreferred: false, isLastName: true, isNameRtl: false },
        ];

        name.truncateNamesData(buildParent(), names, 60);

        expect(truncateNamesMock).toHaveBeenCalledWith(
            expect.any(Array),
            expect.any(Number),
            expect.any(Function),
            expect.objectContaining({ strategy: "SURNAME" }),
        );
    });

    it("returns the (mocked) chart-lib result", () => {
        const name = makeName();
        const names = [
            { label: "Anna", isPreferred: true, isLastName: false, isNameRtl: false },
            { label: "Schmidt", isPreferred: false, isLastName: true, isNameRtl: false },
        ];

        const result = name.truncateNamesData(buildParent(), names, 60);

        expect(result.map((n) => n.label)).toEqual(["A.", "S."]);
    });
});
