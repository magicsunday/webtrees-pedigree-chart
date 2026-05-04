/**
 * This file is part of the package magicsunday/webtrees-pedigree-chart.
 *
 * For the full copyright and license information, please read the
 * LICENSE file distributed with this source code.
 */

/**
 * @import { Orientation } from "@magicsunday/webtrees-chart-lib"
 */

/**
 * The person image box container.
 *
 * @author  Rico Sonntag <mail@ricosonntag.de>
 * @license https://opensource.org/licenses/GPL-3.0 GNU General Public License v3.0
 * @link    https://github.com/magicsunday/webtrees-pedigree-chart/
 */
export default class Image {
    /**
     * Constructor.
     *
     * @param {Orientation} orientation  The current orientation
     * @param {number}      cornerRadius The corner radius of the box
     */
    constructor(orientation, cornerRadius, configuration) {
        this._orientation = orientation;
        this._cornerRadius = cornerRadius;
        this._configuration = configuration;

        this._imagePadding = 5;
        // When no individual in the chart has a portrait/silhouette,
        // collapse the image to zero height so the text block fills the
        // box from the top — see Hierarchy.init's imageVisible flag.
        this._imageRadius =
            configuration && configuration.imageVisible === false
                ? 0
                : Math.min(42.5, this._orientation.boxHeight / 2 - this._imagePadding);

        // Calculate values
        this._width = this.calculateImageWidth();
        this._height = this.calculateImageHeight();
        this._rx = this.calculateCornerRadius();
        this._ry = this.calculateCornerRadius();
        this._x = this.calculateX();
        this._y = this.calculateY();
    }

    /**
     * Returns the calculated X-coordinate.
     *
     * @returns {number}
     */
    calculateX() {
        if (!this._orientation.isVertical) {
            return this._orientation.isDocumentRtl
                ? this._width - this._imagePadding
                : -(this._orientation.boxWidth - this._imagePadding) / 2 + this._imagePadding;
        }

        // Centre the image horizontally inside the box. _image.x is the
        // rect's left edge, so a width-centred rect starts at -width/2.
        return -this._width / 2;
    }

    /**
     * Returns the calculated Y-coordinate.
     *
     * @returns {number}
     */
    calculateY() {
        // Top-anchored for all orientations. When the box grows vertically
        // (extra fact rows), the image stays glued to the top of the box
        // with a small padding, instead of sliding to the middle.
        return -((this._orientation.boxHeight - this._imagePadding) / 2) + this._imagePadding;
    }

    /**
     * Returns the calculated image width.
     *
     * @returns {number}
     */
    calculateImageWidth() {
        return this._imageRadius * 2;
    }

    /**
     * Returns the calculated image height.
     *
     * @returns {number}
     */
    calculateImageHeight() {
        return this._imageRadius * 2;
    }

    /**
     * Returns the calculated corner radius.
     *
     * @returns {number}
     */
    calculateCornerRadius() {
        return this._cornerRadius - this._imagePadding;
    }

    /**
     * Returns the X-coordinate of the center of the image.
     *
     * @returns {number}
     */
    get x() {
        return this._x;
    }

    /**
     * Returns the Y-coordinate of the center of the image.
     *
     * @returns {number}
     */
    get y() {
        return this._y;
    }

    /**
     * Returns the horizontal corner radius of the image.
     *
     * @returns {number}
     */
    get rx() {
        return this._rx;
    }

    /**
     * Returns the vertical corner radius of the image.
     *
     * @returns {number}
     */
    get ry() {
        return this._ry;
    }

    /**
     * Returns the width of the image.
     *
     * @returns {number}
     */
    get width() {
        return this._width;
    }

    /**
     * Returns the height of the image.
     *
     * @returns {number}
     */
    get height() {
        return this._height;
    }
}
