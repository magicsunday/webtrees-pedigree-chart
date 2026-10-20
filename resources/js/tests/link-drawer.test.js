/**
 * This file is part of the package magicsunday/webtrees-pedigree-chart.
 *
 * For the full copyright and license information, please read the
 * LICENSE file distributed with this source code.
 */

import * as d3 from "resources/js/modules/d3.js";
import LinkDrawer from "resources/js/modules/tree/link-drawer.js";

/**
 * Draws one parent link into a fresh SVG and returns the `d` attribute of the
 * path that was appended.
 *
 * @param {object} orientation The orientation values the drawer reads
 * @param {object} link        The d3-hierarchy link to draw
 *
 * @return {string[]}
 */
function drawPaths(orientation, link) {
    document.body.replaceChildren();

    const visual = d3.select(document.body).append("svg").append("g");
    const drawer = new LinkDrawer({ visual }, { orientation, duration: 0 });

    drawer.drawLinks([link], link.source);

    return [...document.querySelectorAll("svg path.link")].map((path) => path.getAttribute("d"));
}

const person = (x, y) => ({ x, y, data: { data: { xref: "X1" } } });

const BOX = { boxWidth: 100, boxHeight: 80, xOffset: 40, yOffset: 60 };

describe("LinkDrawer", () => {
    test.each([
        [
            "vertical, direction 1",
            { ...BOX, isVertical: true, direction: 1 },
            "M0,40L0,70M-70,70L0,70M-70,70L-70,100",
        ],
        [
            "vertical, direction -1",
            { ...BOX, isVertical: true, direction: -1 },
            "M0,-40L0,210M-70,210L0,210M-70,210L-70,180",
        ],
        [
            "horizontal, direction 1",
            { ...BOX, isVertical: false, direction: 1 },
            "M50,0L-140,0M-140,0L-140,140M-140,140L-120,140",
        ],
        [
            "horizontal, direction -1",
            { ...BOX, isVertical: false, direction: -1 },
            "M-50,0L0,0M0,0L0,140M0,140L-20,140",
        ],
    ])("draws the elbow of a parent link (%s)", (_label, orientation, expected) => {
        const paths = drawPaths(orientation, {
            source: person(0, 0),
            target: person(-70, 140),
        });

        expect(paths).toEqual([expected]);
    });
});
