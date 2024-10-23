/**
 * This file is part of the package magicsunday/webtrees-pedigree-chart.
 *
 * For the full copyright and license information, please read the
 * LICENSE file distributed with this source code.
 */

import Orientation from "./orientation";
import elbowHorizontal from "../../tree/elbow/horizontal";

/**
 * This class handles the orientation of the tree.
 *
 * @author  Rico Sonntag <mail@ricosonntag.de>
 * @license https://opensource.org/licenses/GPL-3.0 GNU General Public License v3.0
 * @link    https://github.com/magicsunday/webtrees-pedigree-chart/
 */
export default class OrientationLeftRight extends Orientation
{
    /**
     * Constructor.
     *
     * @param {number} boxWidth  The width of a single individual box
     * @param {number} boxHeight The height of a single individual box
     */
    constructor(boxWidth, boxHeight)
    {
        super(boxWidth, boxHeight);

        this._xOffset = 40;
        this._yOffset = 20;
    }

    get direction()
    {
        return this.isDocumentRtl ? -1 : 1;
    }

    get nodeWidth()
    {
        return this._boxHeight + this._yOffset;
    }

    get nodeHeight()
    {
        return this._boxWidth + this._xOffset;
    }

    norm(d)
    {
        // Swap x and y values
        [d.x, d.y] = [d.y * this.direction, d.x];
    }

    elbow(link)
    {
        return elbowHorizontal(link, this);
    }
}
