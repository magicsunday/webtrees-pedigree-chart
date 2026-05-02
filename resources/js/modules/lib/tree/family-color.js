/**
 * This file is part of the package magicsunday/webtrees-pedigree-chart.
 *
 * For the full copyright and license information, please read the
 * LICENSE file distributed with this source code.
 */

import {
    familyBranchHsl,
    familyCenterHsl,
    hexToHsl,
} from "@magicsunday/webtrees-chart-lib";
import { SEX_FEMALE, SEX_MALE } from "../constants.js";

/**
 * Matches Configuration::MAX_GENERATIONS (PHP). The chart-lib picker-color
 * interpolation needs to know the module's maximum depth so the outermost
 * ring lands on the configured paternal/maternal color exactly.
 *
 * @type {number}
 */
const MAX_GENERATIONS = 25;

/**
 * Computes paternal/maternal lineage colors for pedigree-chart person boxes.
 *
 * Visual scheme matches webtrees-fan-chart byte-for-byte at every depth so
 * the same picker yields the same per-person tint in both modules — both
 * display ancestors, only the layout differs (radial vs. linear). The HSL
 * math + per-branch hue spread + center tint all live in the shared
 * `@magicsunday/webtrees-chart-lib` so both modules stay aligned.
 *
 * Pedigree-chart geometry is linear (no angular position), so this class
 * derives the two inputs the shared helpers need:
 *
 *   - lineage side (paternal/maternal) — by walking up to the depth-1
 *     ancestor and reading its sex
 *   - reference position `half ∈ [0, 1]` within that side — by walking the
 *     parent chain from the reference node down, encoding each "father (0)
 *     or mother (1)" step as one binary-fraction bit
 *
 * @author  Rico Sonntag <mail@ricosonntag.de>
 * @license https://opensource.org/licenses/GPL-3.0 GNU General Public License v3.0
 * @link    https://github.com/magicsunday/webtrees-pedigree-chart/
 */
export default class FamilyColor {
    /**
     * @param {{paternalColor: string, maternalColor: string}} configuration
     */
    constructor(configuration) {
        this._paternalHsl = hexToHsl(configuration.paternalColor);
        this._maternalHsl = hexToHsl(configuration.maternalColor);
    }

    /**
     * Returns an HSL color string for a hierarchy node, or null when no
     * color should be applied.
     *
     * @param {Object} datum The D3 hierarchy datum
     *
     * @returns {string|null}
     */
    getColor(datum) {
        if (datum.data.data.xref === "") {
            return null;
        }

        if (datum.depth === 0) {
            return this._centerColor(datum.data.data.sex);
        }

        const sideAncestor = this._depthOneAncestor(datum);
        if (sideAncestor === null) {
            return null;
        }

        const side = sideAncestor.data.data.sex;
        const baseHsl = side === SEX_MALE
            ? this._paternalHsl
            : (side === SEX_FEMALE ? this._maternalHsl : null);

        if (baseHsl === null) {
            return null;
        }

        return familyBranchHsl(baseHsl, datum.depth, this._refHalfPosition(datum), MAX_GENERATIONS);
    }

    /**
     * Returns the reference-node's normalised position within its
     * paternal/maternal side, in [0, 1]. Mirrors fan-chart's
     * `half = refMidpoint / 0.5` for the equivalent radial geometry.
     *
     * @param {Object} datum
     *
     * @returns {number}
     *
     * @private
     */
    _refHalfPosition(datum) {
        if (datum.depth < 3) {
            return 0.5;
        }

        const path = [];
        let n = datum.parent;

        while (n && n.depth > 1) {
            const parent = n.parent;
            if (!parent?.children) {
                break;
            }
            const idx = parent.children.indexOf(n);
            path.unshift(idx === -1 ? 0 : idx);
            n = parent;
        }

        if (path.length === 0) {
            return 0.5;
        }

        let pathSum = 0;
        for (let i = 0; i < path.length; i++) {
            pathSum += path[i] * 2 ** (path.length - 1 - i);
        }

        return (pathSum + 0.5) / 2 ** path.length;
    }

    /**
     * Returns the root individual's tint, sex-derived.
     *
     * @param {string} sex SEX_MALE / SEX_FEMALE / other
     *
     * @returns {string} HSL color string
     *
     * @private
     */
    _centerColor(sex) {
        if (sex === SEX_MALE) {
            return familyCenterHsl(this._paternalHsl);
        }

        if (sex === SEX_FEMALE) {
            return familyCenterHsl(this._maternalHsl);
        }

        return "hsl(0, 0%, 92%)";
    }

    /**
     * Walks the parent chain until the depth-1 ancestor (= a direct parent
     * of the root individual). Returns null if no such ancestor exists.
     *
     * @param {Object} datum
     *
     * @returns {Object|null}
     *
     * @private
     */
    _depthOneAncestor(datum) {
        let node = datum;

        while (node && node.depth > 1) {
            node = node.parent;
        }

        return node && node.depth === 1 ? node : null;
    }
}
