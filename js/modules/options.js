/**
 * See LICENSE.md file for further details.
 */
import * as d3 from './d3'

export class Options {
    constructor(
        individualUrl,
        updateUrl,
        labels,
        generations  = 3,
        defaultColor = '#eee',
        fontColor    = '#000',
        rtl          = false
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
    }
}
