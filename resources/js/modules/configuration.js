/**
 * This file is part of the package magicsunday/webtrees-pedigree-chart.
 *
 * For the full copyright and license information, please read the
 * LICENSE file distributed with this source code.
 */

import OrientationCollection from "./chart/orientation-collection.js";
import { LAYOUT_LEFTRIGHT } from "./constants.js";

/**
 * @import { Orientation } from "@magicsunday/webtrees-chart-lib"
 */

/**
 * This class handles the configuration of the application.
 *
 * @author  Rico Sonntag <mail@ricosonntag.de>
 * @license https://opensource.org/licenses/GPL-3.0 GNU General Public License v3.0
 * @link    https://github.com/magicsunday/webtrees-pedigree-chart/
 */
export default class Configuration {
    /**
     * Constructor.
     *
     * @param {{zoom: string, move: string}} labels
     * @param {number}   generations
     * @param {string}   treeLayout
     * @param {boolean}  openNewTabOnClick
     * @param {boolean}  showAlternativeName
     * @param {boolean}  showFamilyColors
     * @param {string}   paternalColor
     * @param {string}   maternalColor
     * @param {string}   nameAbbreviation One of "GIVEN" or "SURNAME". Resolved server-side from the tree's SURNAME_TRADITION when admin sets it to AUTO.
     * @param {boolean}  showPlaces
     * @param {boolean}  showAdditionalFacts
     * @param {string[]} factSlots
     * @param {boolean}  rtl
     * @param {number}   direction
     */
    constructor(
        labels,
        generations = 4,
        treeLayout = LAYOUT_LEFTRIGHT,
        openNewTabOnClick = true,
        showAlternativeName = true,
        showFamilyColors = false,
        paternalColor = "#70a9cf",
        maternalColor = "#d06f94",
        nameAbbreviation = "GIVEN",
        showPlaces = false,
        showAdditionalFacts = true,
        factSlots = ["BIRT", "DEAT"],
        rtl = false,
        direction = 1,
    ) {
        // The layout/orientation of the tree
        this._treeLayout = treeLayout;
        this._orientations = new OrientationCollection();

        this._openNewTabOnClick = openNewTabOnClick;
        this._showAlternativeName = showAlternativeName;
        this._showFamilyColors = showFamilyColors;
        this._paternalColor = paternalColor;
        this._maternalColor = maternalColor;
        this._nameAbbreviation = nameAbbreviation;
        this._showPlaces = showPlaces;
        this._showAdditionalFacts = showAdditionalFacts;
        this._factSlots = factSlots;

        // Runtime flags set by Hierarchy.init() — true only when at least
        // one individual in the chart actually has a nickname or
        // alternative name (and the corresponding toggle is on). Kept on
        // the config object so the renderer can reserve space without
        // re-walking the tree for every box.
        this.nicknameVisible = false;
        this.altNameVisible = false;
        // Whether at least one individual in the chart has a portrait or
        // silhouette. When false in a vertical layout, the box drops the
        // image strip and shrinks accordingly.
        this.imageVisible = true;
        // Whether the chart renders only names + dates (no nickname, no
        // alt-name, no places, no optional facts). When true in a
        // vertical layout, the box drops back to its pre-#45 width
        // because the row needs no glyph or place column.
        this.minimalMode = false;
        // Chart-wide max number of populated optional fact rows. Set
        // by Hierarchy.init(); read by the renderer to decide whether
        // the date pair should bottom-anchor (no optional rows) or sit
        // tight under the name region (optional rows fill the bottom).
        this.optionalRows = 0;

        //
        this.duration = 750;

        //
        this.padding = 15;

        // Default number of generations to display
        this._generations = generations;

        // Left/Right padding of a text (used with truncation)
        this.textPadding = 8;

        // // Default font size, color and scaling
        this._fontSize = 14;
        // this._fontScale = fontScale;
        this.fontColor = "rgb(0, 0, 0)";

        // Duration of update animation if clicked on a person
        // this.updateDuration = 1250;

        this.rtl = rtl;
        this.labels = labels;

        // Direction is either 1 (forward) or -1 (backward)
        this.direction = direction;
    }

    /**
     * Returns the number of generations to display.
     *
     * @returns {number}
     */
    get generations() {
        return this._generations;
    }

    /**
     * Sets the number of generations to display.
     *
     * @param {number} value The number of generations to display
     */
    set generations(value) {
        this._generations = value;
    }

    /**
     * Returns the tree layout.
     *
     * @returns {string}
     */
    get treeLayout() {
        return this._treeLayout;
    }

    /**
     * Sets the tree layout.
     *
     * @param {string} value Tree layout value
     */
    set treeLayout(value) {
        this._treeLayout = value;
    }

    /**
     * Returns the current orientation.
     *
     * @returns {Orientation}
     */
    get orientation() {
        return this._orientations.get()[this.treeLayout];
    }

    /**
     * Returns TRUE or FALSE depending on whether to open the current individual's details page in a new tab.
     *
     * @returns {boolean}
     */
    get openNewTabOnClick() {
        return this._openNewTabOnClick;
    }

    /**
     * Returns whether to show or hide the alternative name.
     *
     * @returns {boolean}
     */
    get showAlternativeName() {
        return this._showAlternativeName;
    }

    /**
     * Returns TRUE if person boxes should be tinted by paternal/maternal lineage.
     *
     * @returns {boolean}
     */
    get showFamilyColors() {
        return this._showFamilyColors;
    }

    /**
     * Returns the configured paternal-side base color (hex).
     *
     * @returns {string}
     */
    get paternalColor() {
        return this._paternalColor;
    }

    /**
     * Returns the configured maternal-side base color (hex).
     *
     * @returns {string}
     */
    get maternalColor() {
        return this._maternalColor;
    }

    /**
     * Returns the resolved name-abbreviation strategy ("GIVEN" or "SURNAME").
     * The server resolves the tree-pref value (which can also be "AUTO") into
     * one of these two before serialising — the JS layer never sees AUTO.
     *
     * @returns {string}
     */
    get nameAbbreviation() {
        return this._nameAbbreviation;
    }

    /**
     * Returns TRUE when the box should render the place row beneath each
     * birth/death date. When false, only the dates are drawn and the date
     * pair shifts to the bottom of the box (compact "name + dates" layout).
     *
     * @returns {boolean}
     */
    get showPlaces() {
        return this._showPlaces;
    }

    /**
     * Returns TRUE when the box should display extra fact rows from the
     * tree's CHART_BOX_TAGS preference (beyond the always-on BIRT/DEAT).
     *
     * @returns {boolean}
     */
    get showAdditionalFacts() {
        return this._showAdditionalFacts;
    }

    /**
     * Returns the per-chart list of fact-slot tags. Drives uniform box
     * height: `factSlots.length` rows are reserved in every box.
     *
     * @returns {string[]}
     */
    get factSlots() {
        return this._factSlots;
    }
}
