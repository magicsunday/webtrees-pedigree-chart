/**
 * This file is part of the package magicsunday/webtrees-pedigree-chart.
 *
 * For the full copyright and license information, please read the
 * LICENSE file distributed with this source code.
 */

import * as d3 from "../../d3";

/**
 * Returns the path to draw the vertical connecting lines between the profile
 * boxes for Top/Bottom and Bottom/Top layout.
 *
 * @param {Link}        link        The link object
 * @param {Orientation} orientation The current orientation
 *
 * @returns {string}
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
        sourceX -= (link.source.x - link.spouse.x) / 2;
        sourceY -= getFirstSpouseLinkOffset(link, orientation);
    } else {
        // For each additional family, the link to the child nodes begins at the additional spouse.
        sourceY += (orientation.boxHeight / 2) * orientation.direction;
    }

    // No spouse assigned to source node
    if (link.source.data.data === null) {
        sourceX -= (orientation.boxWidth / 2) + (halfXOffset / 2);
        sourceY += (orientation.boxHeight / 2) * orientation.direction;
    }

    if (link.target !== null) {
        let targetX = link.target.x,
            targetY = link.target.y - (orientation.direction * ((orientation.boxHeight / 2) + halfYOffset));

        const path = d3.path();

        // The line from source/spouse to target
        path.moveTo(sourceX, sourceY);
        path.lineTo(sourceX, targetY);
        path.lineTo(targetX, targetY);
        path.lineTo(targetX, targetY + (orientation.direction * halfYOffset));

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
 * @returns {string}
 */
function createLinksBetweenSpouses(link, orientation)
{
    const path = d3.path();

    // The distance from the line to the node. Causes the line to stop or begin just before the node,
    // instead of going straight to the node, so that the connection to another spouse is clearer.
    const lineStartOffset = 2;

    // Precomputed half width of box
    const boxWidthHalf = orientation.boxWidth / 2;

    let sourceY = link.source.y;

    // Handle multiple spouses
    if (link.spouse.data.spouses.length >= 0) {
        sourceY -= getFirstSpouseLinkOffset(link, orientation);
    }

    // Add a link between first spouse and source
    if (link.coords === null) {
        path.moveTo(link.spouse.x + boxWidthHalf, sourceY);
        path.lineTo(link.source.x - boxWidthHalf, sourceY);
    }

    // Append lines between the source and all spouses
    if (link.coords && (link.coords.length > 0)) {
        for (let i = 0; i < link.coords.length; ++i) {
            let startX = link.spouse.x + boxWidthHalf;
            let endX   = link.coords[i].x - boxWidthHalf;

            if (i > 0) {
                startX = link.coords[i - 1].x + boxWidthHalf;
            }

            let startPosOffset = ((i > 0) ? lineStartOffset : 0);
            let endPosOffset   = (((i + 1) <= link.coords.length) ? lineStartOffset : 0);

            path.moveTo(startX + startPosOffset, sourceY);
            path.lineTo(endX - endPosOffset, sourceY);
        }

        // Add last part from previous spouse to actual spouse
        path.moveTo(
            link.coords[link.coords.length - 1].x + boxWidthHalf + lineStartOffset,
            sourceY
        );

        path.lineTo(
            link.source.x - boxWidthHalf,
            sourceY
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
 * @returns {number}
 */
function getFirstSpouseLinkOffset(link, orientation)
{
    // The distance between the connecting lines when there are multiple spouses
    const spouseLineOffset = 5;

    return (link.source.data.family - Math.ceil(link.spouse.data.spouses.length / 2))
        * orientation.direction
        * spouseLineOffset;
}
