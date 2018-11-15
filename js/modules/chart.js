/**
 * See LICENSE.md file for further details.
 */
import { config } from "./config";
import { Tree } from "./tree";
import * as d3 from "./d3";

/**
 * Initialize the chart.
 *
 * @public
 */
export function initChart(data)
{
    let margin = { top: 20, right: 90, bottom: 30, left: 90 },
        width  = 960 - margin.left - margin.right,
        height = 960 - margin.top - margin.bottom;

    // Parent container
    config.parent = d3.select("#pedigree_chart");

    const zoom = initZoom();

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

        .call(zoom)

        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    var ancestorTree = new Tree(config.svg, "ancestor", 1, width, height, data);

    // Draw the tree
    ancestorTree.draw();
}

function initZoom()
{
    // Setup zoom and pan
    return d3.zoom()
        .scaleExtent([0.1, 10.0])
        .on("zoom", function() {
            config.svg.attr("transform", d3.event.transform);
        });
}
