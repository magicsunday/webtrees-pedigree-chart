/*jslint es6: true */
/*jshint esversion: 6 */
/**
 * See LICENSE.md file for further details.
 */

import { config } from "./config";
import { Tree } from "./tree";
import initZoom from "./zoom";
import * as d3 from "./d3";

/**
 * Initialize the chart.
 *
 * @param {Array} data The ancestor data to display
 *
 * @public
 */
export function initChart(data)
{
    let margin = { top: 20, right: 20, bottom: 20, left: 20 },
        width  = 960 - margin.left - margin.right,
        height = 960 - margin.top - margin.bottom;

    config.translateX = 150;
    config.translateY = height / 2;

    // Parent container
    config.parent = d3.select("#pedigree_chart");

    config.zoom = initZoom();

    // Add SVG element
    config.svg = config.parent
        .append("svg")
        .attr("version", "1.1")
        .attr("xmlns", "http://www.w3.org/2000/svg")
        .attr("xmlns:xlink", "http://www.w3.org/1999/xlink")
        .attr("width", width + margin.right + margin.left)
        .attr("height", height + margin.top + margin.bottom)
        // .attr("width", "100%")
        // .attr("height", "100%")
        .attr("text-rendering", "geometricPrecision")
        .attr("text-anchor", "middle")
        .call(config.zoom);

    config.visual = config.svg
        .append("g")
        .attr("transform", d => `translate(${config.translateX}, ${config.translateY})`);

    // Bind click event on reset button
    d3.select("#resetButton")
        .on("click", doReset);

    let ancestorTree = new Tree(config.visual, 1, data);

    // Draw the tree
    ancestorTree.draw();
}

/**
 * Reset chart to initial zoom level and position.
 *
 * @private
 */
function doReset()
{
    config.svg
        .transition()
        .duration(750)
        .call(config.zoom.transform, d3.zoomIdentity.translate(config.translateX, config.translateY));
}
