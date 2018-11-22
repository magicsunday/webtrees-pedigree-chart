/*jslint es6: true */
/*jshint esversion: 6 */
/**
 * See LICENSE.md file for further details.
 */

/**
 * Option class.
 */
export class Options
{
    /**
     * Constructor.
     *
     * @param individualUrl
     * @param updateUrl
     * @param labels
     * @param generations
     * @param defaultColor
     * @param fontColor
     * @param rtl
     */
    constructor(
        individualUrl,
        updateUrl,
        labels,
        generations   = 3,
        defaultColor  = "#eee",
        fontColor     = "#000",
        rtl           = false,
        showEmptyBoxes = false
    ) {
        this.data = null;

        // Default number of generations to display
        this.generations = generations;

        // Left/Right padding of text (used with truncation)
        this.textPadding = 8;

        // Default background color of an arc
        this.defaultColor = defaultColor;

        // Default font size, color and scaling
        this.fontSize  = 14;
        this.fontColor = fontColor;

        this.individualUrl = individualUrl;

        this.showEmptyBoxes = showEmptyBoxes;
    }
}
