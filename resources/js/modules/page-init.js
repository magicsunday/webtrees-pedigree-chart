/**
 * This file is part of the package magicsunday/webtrees-pedigree-chart.
 *
 * For the full copyright and license information, please read the
 * LICENSE file distributed with this source code.
 */

import { Storage } from "@magicsunday/webtrees-chart-lib";

/**
 * Builds the AJAX URL for fetching chart data from the current form state.
 *
 * @param {string}      baseUrl
 * @param {string|null} generations
 *
 * @returns {string}
 */
function getUrl(baseUrl, generations) {
    const url = new URL(baseUrl);
    url.searchParams.set("xref", document.getElementById("xref").value);
    url.searchParams.set("generations", generations);

    return url.toString();
}

/**
 * Restores the "Show more options" collapse state from localStorage and
 * toggles the button label text on each click.
 *
 * @param {Storage} storage
 */
function toggleMoreOptions(storage) {
    const showMoreOptions = document.getElementById("showMoreOptions");
    const optionsToggle = document.getElementById("options");

    showMoreOptions.addEventListener("shown.bs.collapse", () => {
        storage.write("showMoreOptions", true);
    });

    showMoreOptions.addEventListener("hidden.bs.collapse", () => {
        storage.write("showMoreOptions", false);
    });

    optionsToggle.addEventListener("click", () => {
        Array.from(optionsToggle.children).forEach((element) => {
            element.classList.toggle("d-none");
        });
    });

    if (storage.read("showMoreOptions")) {
        optionsToggle.click();
    }
}

/**
 * Initialises the pedigree chart page: restores form values from
 * localStorage, sets up event listeners, builds the initial AJAX URL,
 * and publishes the resolved chart options under the WebtreesPedigreeChart
 * UMD global so chart.phtml getters can read user overrides.
 *
 * @param {Object} config
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

    toggleMoreOptions(storage);

    const formElements = document.getElementById("webtrees-pedigree-chart-form").elements;
    formElements.namedItem("layout").value = storage.read("layout");

    const generationsRaw = storage.read("generations");

    const chartOptions = {
        generations: generationsRaw === null ? null : Number.parseInt(generationsRaw, 10),
        treeLayout: storage.read("layout"),
        openNewTabOnClick: storage.read("openNewTabOnClick"),
        showAlternativeName: storage.read("showAlternativeName"),
        showNicknames: storage.read("showNicknames"),
        showFamilyColors: storage.read("showFamilyColors"),
        paternalColor: storage.read("paternalColor"),
        maternalColor: storage.read("maternalColor"),
    };

    if (typeof window.WebtreesPedigreeChart !== "undefined") {
        window.WebtreesPedigreeChart.chartOptions = chartOptions;
    }

    const ajaxUrl = getUrl(config.ajaxUrl, storage.read("generations"));
    document.getElementById("pedigree-chart-url").setAttribute("data-wt-ajax-url", ajaxUrl);
}
