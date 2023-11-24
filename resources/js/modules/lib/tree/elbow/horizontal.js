/**
 * This file is part of the package magicsunday/webtrees-pedigree-chart.
 *
 * For the full copyright and license information, please read the
 * LICENSE file distributed with this source code.
 */

import * as d3 from "../../d3";

/**
 * Returns the path to draw the horizontal connecting lines between the profile
 * boxes for Left/Right and Right/Left layout.
 *
 * @param {Link}        link        The link object
 * @param {Orientation} orientation The current orientation
 *
 * @returns {String}
 *
 * Curved edges => https://observablehq.com/@bumbeishvili/curved-edges-horizontal-d3-v3-v4-v5-v6
 */
export default function(link, orientation)
{
    const halfXOffset = orientation.xOffset / 2;
    const halfYOffset = orientation.yOffset / 2;

    let sourceX = link.source.x,
        sourceY = link.source.y;

    if ((typeof link.spouse !== "undefined") && (link.source.data.family === 0)) {
        // For the first family, the link to the child nodes begins between
        // the individual and the first spouse.
        sourceX -= getFirstSpouseLinkOffset(link, orientation);
        sourceY -= (link.source.y - link.spouse.y) / 2;
    } else {
        // For each additional family, the link to the child nodes begins at the additional spouse.
        sourceX += (orientation.boxWidth / 2) * orientation.direction;
    }

    // No spouse assigned to source node
    if (link.source.data.data === null) {
        sourceX += (orientation.boxWidth / 2) * orientation.direction;
        sourceY -= (orientation.boxHeight / 2) + (halfYOffset / 2);
    }

    if (link.target !== null) {
        let targetX = link.target.x - (orientation.direction * ((orientation.boxWidth / 2) + halfXOffset)),
            targetY = link.target.y;

        const path = d3.path();

        // The line from source/spouse to target
        path.moveTo(sourceX, sourceY);
        path.lineTo(targetX, sourceY);
        path.lineTo(targetX, targetY);
        path.lineTo(targetX + (orientation.direction * halfXOffset), targetY);

        return path.toString();
    }

    return createLinksBetweenSpouses(link, orientation);
}

/**
 * Returns the path needed to draw the lines between each spouse.
 *
 * @param {Link}        link        The link object
 * @param {Orientation} orientation The current orientation
 *
 * @return {String}
 */
function createLinksBetweenSpouses(link, orientation)
{
    const path = d3.path();

    // The distance from the line to the node. Causes the line to stop or begin just before the node,
    // instead of going straight to the node, so that the connection to another spouse is clearer.
    const lineStartOffset = 2;

    // Precomputed half height of box
    const boxHeightHalf = orientation.boxHeight / 2;

    let sourceX = link.source.x;

    // Handle multiple spouses
    if (link.spouse.data.spouses.length >= 0) {
        sourceX -= getFirstSpouseLinkOffset(link, orientation);
    }

    // Add a link between first spouse and source
    if (link.coords === null) {
        path.moveTo(sourceX, link.spouse.y + boxHeightHalf);
        path.lineTo(sourceX, link.source.y - boxHeightHalf);
    }

    // Append lines between the source and all spouses
    if (link.coords && (link.coords.length > 0)) {
        for (let i = 0; i < link.coords.length; ++i) {
            let startY = link.spouse.y + boxHeightHalf;
            let endY   = link.coords[i].y - boxHeightHalf;

            if (i > 0) {
                startY = link.coords[i - 1].y + boxHeightHalf;
            }

            let startPosOffset = ((i > 0) ? lineStartOffset : 0);
            let endPosOffset   = (((i + 1) <= link.coords.length) ? lineStartOffset : 0);

            path.moveTo(sourceX, startY + startPosOffset);
            path.lineTo(sourceX, endY - endPosOffset);
        }

        // Add last part from previous spouse to actual spouse
        path.moveTo(
            sourceX,
            link.coords[link.coords.length - 1].y + boxHeightHalf + lineStartOffset
        );

        path.lineTo(
            sourceX,
            link.source.y - boxHeightHalf
        );
    }

    return path.toString();
}

/**
 * Calculates the offset for the coordinate of the first spouse.
 *
 * @param {Link}        link        The link object
 * @param {Orientation} orientation The current orientation
 *
 * @return {Number}
 */
function getFirstSpouseLinkOffset(link, orientation)
{
    // The distance between the connecting lines when there are multiple spouses
    const spouseLineOffset = 5;

    return (link.source.data.family - Math.ceil(link.spouse.data.spouses.length / 2))
        * orientation.direction
        * spouseLineOffset;
}
