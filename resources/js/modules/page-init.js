/**
 * This file is part of the package magicsunday/webtrees-pedigree-chart.
 *
 * For the full copyright and license information, please read the
 * LICENSE file distributed with this source code.
 */

import {
    buildChartAjaxUrl,
    setChartAjaxUrl,
    setChartOptionsGlobal,
    Storage,
    syncCollapseToggle,
} from "@magicsunday/webtrees-chart-lib/chart-core";

/**
 * Initialises the pedigree chart page: restores form values from localStorage,
 * sets up event listeners, builds the initial AJAX URL, and publishes the
 * resolved chart options under the WebtreesPedigreeChart UMD global so
 * chart.phtml getters can read user overrides.
 *
 * @param {object} config
 * @param {string} config.ajaxUrl The base AJAX endpoint URL
 */
export function initPage(config) {
    const storage = new Storage("webtrees-pedigree-chart");

    storage.register("generations");
    storage.register("layout");
    storage.register("openNewTabOnClick");
    storage.register("showAlternativeName");
    storage.register("showNicknames");
    storage.register("showFamilyColors");
    storage.register("paternalColor");
    storage.register("maternalColor");

    syncCollapseToggle(storage);

    const form = /** @type {HTMLFormElement} */ (
        document.getElementById("webtrees-pedigree-chart-form")
    );
    const layoutInput = /** @type {HTMLInputElement|null} */ (form.elements.namedItem("layout"));
    if (layoutInput) {
        layoutInput.value = storage.readString("layout", "");
    }

    /**
     * Resolved user options. `null` here means "user has not overridden the
     * server default"; chart.phtml falls back to the PHP-side value via `??`.
     *
     * Only options that the chart re-evaluates client-side belong here.
     * showNicknames is server-rendered through DataFacade so it is persisted in
     * localStorage via storage.register() above (to keep the form state across
     * reloads) but does NOT need to ship in chartOptions — chart.phtml has no
     * matching getter.
     *
     * @type {{
     *   generations: number|null,
     *   treeLayout: string|null,
     *   openNewTabOnClick: boolean|null,
     *   showAlternativeName: boolean|null,
     *   showFamilyColors: boolean|null,
     *   paternalColor: string|null,
     *   maternalColor: string|null,
     * }}
     */
    const chartOptions = {
        generations: storage.readNumber("generations"),
        treeLayout: storage.readString("layout"),
        openNewTabOnClick: storage.readBool("openNewTabOnClick"),
        showAlternativeName: storage.readBool("showAlternativeName"),
        showFamilyColors: storage.readBool("showFamilyColors"),
        paternalColor: storage.readString("paternalColor"),
        maternalColor: storage.readString("maternalColor"),
    };

    // WebtreesPedigreeChart is the UMD global exposed by the chart-page
    // bundle; chart.phtml reads chartOptions from it.
    setChartOptionsGlobal("WebtreesPedigreeChart", chartOptions);

    const ajaxUrl = buildChartAjaxUrl(config.ajaxUrl, {
        query: [{ key: "generations", value: storage.readString("generations") }],
    });
    setChartAjaxUrl("pedigree-chart-url", ajaxUrl);
}
