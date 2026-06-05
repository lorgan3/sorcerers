import { Graphics, Text } from "pixi.js";
import { Graph } from "../bot/graph";
import { Edge, EdgeType } from "../bot/edge";
import { Path } from "../bot/path";
import { isBotDebugEnabled } from "../bot/debug";

export class DebugLayer extends Graphics {
  private graph: Graph | null = null;

  draw(graph: Graph) {
    this.graph = graph;
    if (!isBotDebugEnabled()) return;
    this.clear();

    for (let node of this.graph.getNodes()) {
      for (let edge of node.edges) {
        this.drawEdge(edge);
      }

      this.circle(node.x * 6, node.y * 6, 6);
      this.fill(node.isLadder() ? "#00ff00" : "#000000");
    }
  }

  drawPath(path: Path) {
    if (!isBotDebugEnabled()) return;
    this.removeChildren();

    let i = 1;
    for (let edge of path.edges) {
      this.addChild(
        new Text({
          text: `${i}`,
          x: ((edge.from.x + edge.to.x) / 2) * 6,
          y: ((edge.from.y + edge.to.y) / 2) * 6,
          style: { fontFamily: "Eternal", fontSize: 32, align: "center" },
        })
      );
      i++;
    }
  }

  highlightEdge(edge: Edge) {
    if (!isBotDebugEnabled() || !this.graph) return;
    this.draw(this.graph);
    this.drawEdge(edge, 3);

    this.circle(edge.from.x * 6, edge.from.y * 6, 10);
    this.fill("#ffffff");
    this.circle(edge.to.x * 6, edge.to.y * 6, 10);
    this.fill("#ffffff");
  }

  private drawEdge(edge: Edge, width = 1) {
    this.moveTo(edge.to.x * 6, edge.to.y * 6);
    this.lineTo(edge.from.x * 6, edge.from.y * 6);
    this.stroke({
      color:
        edge.type === EdgeType.Jump
          ? "#ff0000"
          : edge.type === EdgeType.Fall
          ? "#0000ff"
          : edge.type === EdgeType.Climb
          ? "#00ff00"
          : "#000000",
      width,
    });
  }
}
