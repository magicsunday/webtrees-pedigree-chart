/**
 * See LICENSE.md file for further details.
 */

/**
 * Draw the horizontal connecting lines between the profile boxes for Left/Right and Right/Left layout.
 *
 * @param {Object}      datum       D3 data object
 * @param {Orientation} orientation The current orientation
 */
export default function(datum, orientation)
{
    // Left => Right, Right => Left
    const sourceX = datum.source.x + (orientation.direction() * (orientation.boxWidth / 2)),
          sourceY = datum.source.y,
          targetX = datum.target.x - (orientation.direction() * (orientation.boxWidth / 2)),
          targetY = datum.target.y;

    return "M " + sourceX + " " + sourceY +
        " H " + (sourceX + ((targetX - sourceX) / 2)) +
        " V " + targetY +
        " H " + targetX;
}
