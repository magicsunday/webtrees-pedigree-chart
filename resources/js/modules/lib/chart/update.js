/**
 * This file is part of the package magicsunday/webtrees-pedigree-chart.
 *
 * For the full copyright and license information, please read the
 * LICENSE file distributed with this source code.
 */

import * as d3 from "./../d3";

/**
 * This class handles the visual update of all text and path elements.
 *
 * @author  Rico Sonntag <mail@ricosonntag.de>
 * @license https://opensource.org/licenses/GPL-3.0 GNU General Public License v3.0
 * @link    https://github.com/magicsunday/webtrees-pedigree-chart/
 */
export default class Update {
    /**
     * Constructor.
     *
     * @param {Svg}           svg
     * @param {Configuration} configuration The application configuration
     * @param {Hierarchy}     hierarchy
     */
    constructor(svg, configuration, hierarchy) {
        this._svg = svg;
        this._configuration = configuration;
        this._hierarchy = hierarchy;
    }

    /**
     * Update the chart with data loaded from AJAX.
     *
     * @param {string}   url      The update URL
     * @param {Function} callback The callback method to execute after the update
     *
     * @public
     */
    update(url, callback) {
        const that = this;

        this._svg
            .selectAll("g.person")
            .classed("hover", false)
            .on("click", null)
            .on("mouseover", null)
            .on("mouseout", null);

        d3.json(
            url,
        ).then((data) => {
            // Initialize the new loaded data
            this._hierarchy.init(data);
            this.draw();

            this.updateIndividualSelector(data.data.xref);
        });
    }

    /**
     * Updates the individual selector (TomSelect) to reflect the currently
     * displayed person after navigating in the chart.
     *
     * @param {string} xref The XREF of the individual to select
     *
     * @private
     */
    updateIndividualSelector(xref) {
        const indSelector = document.getElementById("xref");
        const ajaxUrl = indSelector.getAttribute("data-ajax--url");
        const csrfToken = document.head.querySelector("meta[name=csrf]").getAttribute("content");

        fetch(ajaxUrl, {
            method: "POST",
            credentials: "same-origin",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "X-CSRF-TOKEN": csrfToken,
                "x-requested-with": "XMLHttpRequest",
            },
            body: new URLSearchParams({ q: xref }),
        })
            .then((response) => response.json())
            .then((result) => {
                if (indSelector.tomselect && result.results.length > 0) {
                    const item = result.results[0];
                    const tomSelect = indSelector.tomselect;

                    tomSelect.clear(true);
                    tomSelect.clearOptions();
                    tomSelect.addOption({ value: item.id, text: item.text });
                    tomSelect.refreshOptions();
                    tomSelect.addItem(item.id, true);
                    tomSelect.refreshItems();
                }
            });
    }
}
