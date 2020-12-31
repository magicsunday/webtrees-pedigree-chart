/**
 * See LICENSE.md file for further details.
 */

import Orientation from "./orientation";
import elbowVertical from "../elbow/vertical";

/**
 * This class handles the orientation of the tree.
 *
 * @author  Rico Sonntag <mail@ricosonntag.de>
 * @license https://opensource.org/licenses/GPL-3.0 GNU General Public License v3.0
 * @link    https://github.com/magicsunday/webtrees-pedigree-chart/
 */
export default class OrientationTopBottom extends Orientation
{
    /**
     * Constructor.
     *
     * @param {Number} boxWidth  The width of a single individual box
     * @param {Number} boxHeight The height of a single individual box
     */
    constructor(boxWidth, boxHeight)
    {
        super(boxWidth, boxHeight);
    }

    direction()
    {
        return 1;
    }

    nodeWidth()
    {
        return (this._boxWidth * 2) + 30;
    }

    norm(d)
    {
        d.y = this.direction() * d.depth * (this._boxHeight + 30);
    }

    elbow(d)
    {
        return elbowVertical(d, this);
    }

    x(d)
    {
        return d.x;
    }

    y(d)
    {
        return d.y;
    }
}
