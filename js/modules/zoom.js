/*jslint es6: true */
/*jshint esversion: 6 */
/**
 * See LICENSE.md file for further details.
 */

import { config } from "./config";
import * as d3 from "./d3";

export default function initZoom() {
    const MIN_ZOOM = 0.1;
    const MAX_ZOOM = 10.0;

    // Setup zoom and pan
    return d3.zoom()
        .scaleExtent([MIN_ZOOM, MAX_ZOOM])
        .on("zoom", function () {
            config.svg.attr("transform", d3.event.transform);
        });
};
