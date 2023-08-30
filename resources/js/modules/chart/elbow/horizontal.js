/**
 * This file is part of the package magicsunday/webtrees-pedigree-chart.
 *
 * For the full copyright and license information, please read the
 * LICENSE file that was distributed with this source code.
 */

import * as d3 from "../../d3";

/**
 * Draw the horizontal connecting lines between the profile boxes for Left/Right and Right/Left layout.
 *
 * @param {Link}        link        The link object
 * @param {Orientation} orientation The current orientation
 */
export default function(link, orientation)
{
    const path = d3.path();

    // Left => Right, Right => Left
    const sourceX = link.source.x + (orientation.direction() * (orientation.boxWidth / 2)),
          sourceY = link.source.y,
          targetX = link.target.x - (orientation.direction() * (orientation.boxWidth / 2)),
          targetY = link.target.y;

    path.moveTo(sourceX, sourceY);
    path.lineTo((sourceX + ((targetX - sourceX) / 2)), sourceY);
    path.lineTo((sourceX + ((targetX - sourceX) / 2)), targetY);
    path.lineTo(targetX, targetY);

    return path.toString();
}
