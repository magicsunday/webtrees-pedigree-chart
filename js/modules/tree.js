/**
 * See LICENSE.md file for further details.
 */
import * as d3 from './d3'

/**
 * Shared code for drawing ancestors or descendants.
 * `selector` is a class that will be applied to links
 * and nodes so that they can be queried later when
 * the tree is redrawn.
 * `direction` is either 1 (forward) or -1 (backward).
 */
export class Tree
{
    constructor(svg, selector, direction, width, height, data) {

        this.boxWidth   = 250;
        this.boxHeight  = 80;
        this.nodeWidth  = 300;
        this.nodeHeight = 100;

        // d3 multiplies the node size by this value
        // to calculate the distance between nodes
        this.separation = 0.5;

        this.svg       = svg;
        this.selector  = selector;
        this.direction = direction;

        let self = this;

        // Declares a tree layout and assigns the size
        let treeLayout = d3.tree()
            // Using nodeSize we are able to control
            // the separation between nodes. If we used
            // the size parameter instead then d3 would
            // calculate the separation dynamically to fill
            // the available space.
            .nodeSize([this.nodeWidth, this.nodeHeight])

            // By default, cousins are drawn further apart than siblings.
            // By returning the same value in all cases, we draw cousins
            // the same distance apart as siblings.
            .separation(
                d => this.separation
            )
        ;

        this.root = d3.hierarchy(data);

        // maps the node data to the tree layout
        this.treeNodes = treeLayout(this.root);
    }

    /**
     * Draw/redraw the tree
     */
    draw() {
        if (this.root) {
            let nodes = this.treeNodes.descendants();
            let links = this.treeNodes.links();

            // Normalize for fixed-depth.
            nodes.forEach(function (d) { d.y = d.depth * 300; });

            this.drawLinks(links, this.treeNodes);
            this.drawNodes(nodes, this.treeNodes);
        } else {
            throw new Error('Missing root');
        }

        return this;
    }

    /**
     * Draw/redraw the person boxes.
     */
    drawNodes(nodes, source) {
        let self = this;

        // Update nodes
        let node = self.svg
            .selectAll("g.person." + self.selector)
            .data(nodes);

        // Add new nodes
        let nodeEnter = node
            .enter()
            .append("g")
            .attr("class", "person " + self.selector)
            .attr('transform', d => `translate(${d.y}, ${d.x})`);

        // Draw the rectangle person boxes.
        // Start new boxes with 0 size so that
        // we can transition them to their proper size.
        nodeEnter.append("rect")
            .attr("x", -(self.boxWidth / 2))
            .attr("y", -(self.boxHeight / 2))
            .attr("width", self.boxWidth)
            .attr("height", self.boxHeight);

        // Draw the person's name and position it inside the box
        nodeEnter.append("text")
            .attr("dx", -(self.boxWidth / 2) + 10)
            .attr("dy", "-1.5em")
            .attr("text-anchor", "start")
            .attr('class', 'name')
            .text(d => `${d.data.name}`);

        nodeEnter.append("text")
            .attr("dx", -(self.boxWidth / 2) + 10)
            .attr("dy", "1em")
            .attr("text-anchor", "start")
            .attr('class', 'born')
            .text(d => `${d.data.born}`);

        nodeEnter.append("text")
            .attr("dx", -(self.boxWidth / 2) + 10)
            .attr("dy", "2em")
            .attr("text-anchor", "start")
            .attr('class', 'died')
            .text(d => `${d.data.died}`);
    }

    /**
     * Draw/redraw the connecting lines
     */
    drawLinks(links, source) {
        let self = this;

        // Update links
        let link = self.svg
            .selectAll("path.link." + self.selector)
            .data(links);

        // Add new links
        link.enter()
            .append("path")
            // .classed('link', true)
            .attr("class", "link " + self.selector)
            .attr("d", function (d) {
                return self.elbow(d, self.direction);
            });
    }

    /**
     * Custom path function that creates straight connecting lines. Calculate start and end position of links.
     * Instead of drawing to the center of the node, draw to the border of the person profile box.
     * That way drawing order doesn't matter. In other words, if we draw to the center of the node
     * then we have to draw the links first and the draw the boxes on top of them.
     */
    elbow(d, direction) {
        let sourceX = d.source.x,
            sourceY = d.source.y + (this.boxWidth / 2),
            targetX = d.target.x,
            targetY = d.target.y - (this.boxWidth / 2);

        return "M" + (direction * sourceY) + "," + sourceX
            + "H" + (direction * (sourceY + (targetY - sourceY) / 2))
            + "V" + targetX
            + "H" + (direction * targetY);
    }
}
