/*jslint es6: true */
/*jshint esversion: 6 */
/**
 * See LICENSE.md file for further details.
 */

import { config } from "./config";
import { Tree } from "./tree";
import initZoom from "./zoom";
import * as d3 from "./d3";

const MIN_HEIGHT  = 750;
const MIN_PADDING = 10;   // Minimum padding around view box

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

    // config.translateX = 150;
    // config.translateY = height / 2;

    // Parent container
    config.parent = d3.select("#pedigree_chart");

    config.zoom = initZoom();

    // Add SVG element
    config.svg = config.parent
        .append("svg")
        .attr("version", "1.1")
        .attr("xmlns", "http://www.w3.org/2000/svg")
        .attr("xmlns:xlink", "http://www.w3.org/1999/xlink")
        // .attr("width", width + margin.right + margin.left)
        // .attr("height", height + margin.top + margin.bottom)
        .attr("width", "100%")
        .attr("height", "100%")
        .attr("text-rendering", "geometricPrecision")
        .attr("text-anchor", "middle")
        .call(config.zoom);

    config.visual = config.svg
        .append("g")
        // .attr("transform", d => `translate(${config.translateX}, ${config.translateY})`)
    ;

    updateViewBox();

    // Bind click event on reset button
    d3.select("#resetButton")
        .on("click", doReset);

    let defs = config.svg
        .append("defs")
        .attr("id", "imgdefs");

    let clipPath = defs
        .append('clipPath')
        .attr('id', 'clip-circle')
        .append("circle")
        .attr("r", 35)
        .attr("cx", -90)
        .attr("cy", 0);

    let ancestorTree = new Tree(config.visual, 1, data);

    // Draw the tree
    ancestorTree.draw();

}

/**
 * Update/Calculate the viewBox attribute of the SVG element.
 *
 * @private
 */
function updateViewBox()
{
    // Get bounding boxes
    let svgBoundingBox    = config.visual.node().getBBox();
    let clientBoundingBox = config.parent.node().getBoundingClientRect();

    // View box should have at least the same width/height as the parent element
    let viewBoxWidth  = Math.max(clientBoundingBox.width, svgBoundingBox.width);
    let viewBoxHeight = Math.max(clientBoundingBox.height, svgBoundingBox.height, MIN_HEIGHT);

    // Calculate offset to center chart inside svg
    let offsetX = (viewBoxWidth - svgBoundingBox.width) / 2;
    let offsetY = (viewBoxHeight - svgBoundingBox.height) / 2;

    // Adjust view box dimensions by padding and offset
    let viewBoxLeft = Math.ceil(svgBoundingBox.x - offsetX - MIN_PADDING);
    let viewBoxTop  = Math.ceil(svgBoundingBox.y - offsetY - MIN_PADDING);

    // Final width/height of view box
    viewBoxWidth  = Math.ceil(viewBoxWidth + (MIN_PADDING * 2));
    viewBoxHeight = Math.ceil(viewBoxHeight + (MIN_PADDING * 2));

    // Set view box attribute
    config.svg
        .attr("viewBox", [
            viewBoxLeft,
            viewBoxTop,
            viewBoxWidth,
            viewBoxHeight
        ]);
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
        .call(config.zoom.transform, d3.zoomIdentity); //.translate(config.translateX, config.translateY));
}
