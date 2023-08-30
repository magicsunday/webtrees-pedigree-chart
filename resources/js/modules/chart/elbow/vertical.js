/**
 * This file is part of the package magicsunday/webtrees-pedigree-chart.
 *
 * For the full copyright and license information, please read the
 * LICENSE file that was distributed with this source code.
 */

import * as d3 from "../../d3";

/**
 * Draw the vertical connecting lines between the profile boxes for Top/Bottom and Bottom/Top layout.
 *
 * @param {Link}        link        The link object
 * @param {Orientation} orientation The current orientation
 */
export default function(link, orientation)
{
    const path = d3.path();

    // Top => Bottom, Bottom => Top
    const sourceX = link.source.x,
          sourceY = link.source.y + (orientation.direction() * (orientation.boxHeight / 2)),
          targetX = link.target.x,
          targetY = link.target.y - (orientation.direction() * (orientation.boxHeight / 2));

    path.moveTo(sourceX, sourceY);
    path.lineTo(sourceX, (sourceY + ((targetY - sourceY) / 2)));
    path.lineTo(targetX, (sourceY + ((targetY - sourceY) / 2)));
    path.lineTo(targetX, targetY);

    return path.toString();
}
