import { Container, Graphics } from "pixi.js";
import { PathNode, PathEdge } from "../data/pathfinding/types";
import { PathfindingService } from "../data/pathfinding/pathfindingService";

export class PathfindingDebugLayer extends Container {
  private nodeGraphics: Graphics;
  private edgeGraphics: Graphics;
  private isVisible = false;
  private lastUpdateTime = 0;
  private updateInterval = 2000; // Update every 2 seconds

  constructor() {
    super();

    // Create graphics objects for nodes and edges
    this.edgeGraphics = new Graphics();
    this.nodeGraphics = new Graphics();

    // Add in correct order (edges behind nodes)
    this.addChild(this.edgeGraphics, this.nodeGraphics);

    // Initially hidden
    this.visible = true;
  }

  /**
   * Toggle visibility of the debug layer
   */
  public toggleVisibility(): void {
    this.isVisible = !this.isVisible;
    this.visible = this.isVisible;

    if (this.isVisible) {
      this.updateVisualization();
      console.log("Pathfinding debug visualization enabled");
    } else {
      console.log("Pathfinding debug visualization disabled");
    }
  }

  /**
   * Set visibility of the debug layer
   */
  public setVisibility(visible: boolean): void {
    this.isVisible = visible;
    this.visible = visible;

    if (this.isVisible) {
      this.updateVisualization();
    }
  }

  /**
   * Update the visualization (call periodically)
   */
  public tick(dt: number): void {
    if (!this.isVisible) return;

    const currentTime = Date.now();
    if (currentTime - this.lastUpdateTime > this.updateInterval) {
      this.updateVisualization();
      this.lastUpdateTime = currentTime;
    }
  }

  /**
   * Update the debug visualization
   */
  private updateVisualization(): void {
    try {
      const pathfindingService = PathfindingService.getInstance();

      if (!pathfindingService.getDebugInfo().isBuilt) {
        console.log("Pathfinding graph not built yet");
        return;
      }

      const nodes = pathfindingService.getAllNodes();

      if (nodes.length === 0) {
        console.log("No nodes to visualize");
        return;
      }

      this.drawNodes(nodes);
      this.drawEdges(nodes);

      console.log(`Updated pathfinding visualization: ${nodes.length} nodes`);
    } catch (error) {
      console.warn("Error updating pathfinding visualization:", error);
    }
  }

  /**
   * Draw all nodes
   */
  private drawNodes(nodes: PathNode[]): void {
    this.nodeGraphics.clear();

    for (const node of nodes) {
      const x = node.x * 6; // Convert grid to world coordinates
      const y = node.y * 6;

      // Choose color based on node type
      let color: number;
      let size: number;

      switch (node.type) {
        case "ground":
          color = 0x00ff00; // Green for ground nodes
          size = 3;
          break;
        case "ladder":
          color = 0xffff00; // Yellow for ladder nodes
          size = 4;
          break;
        case "air":
          color = 0x00ffff; // Cyan for air nodes
          size = 2;
          break;
        default:
          color = 0xff0000; // Red for unknown types
          size = 3;
      }

      // Draw node as a circle
      this.nodeGraphics.beginFill(color, 0.8);
      this.nodeGraphics.drawCircle(x, y, size);
      this.nodeGraphics.endFill();

      // Draw border
      this.nodeGraphics.lineStyle(1, 0x000000, 0.5);
      this.nodeGraphics.drawCircle(x, y, size);
      this.nodeGraphics.lineStyle(0);
    }
  }

  /**
   * Draw all edges (connections between nodes)
   */
  private drawEdges(nodes: PathNode[]): void {
    this.edgeGraphics.clear();

    for (const node of nodes) {
      const startX = node.x * 6;
      const startY = node.y * 6;

      for (const edge of node.connections) {
        const endX = edge.target.x * 6;
        const endY = edge.target.y * 6;

        // Choose color and style based on movement type
        let color: number;
        let alpha: number;
        let thickness: number;

        switch (edge.movementType) {
          case "walk":
            color = 0x00ff00; // Green for walking
            alpha = 0.6;
            thickness = 2;
            break;
          case "jump":
            color = 0xff8800; // Orange for jumping
            alpha = 0.7;
            thickness = 3;
            break;
          case "climb":
            color = 0xffff00; // Yellow for climbing
            alpha = 0.6;
            thickness = 2;
            break;
          case "fall":
            color = 0x8888ff; // Light blue for falling
            alpha = 0.4;
            thickness = 1;
            break;
          default:
            color = 0xff0000; // Red for unknown
            alpha = 0.5;
            thickness = 1;
        }

        // Draw edge as a line
        this.edgeGraphics.lineStyle(thickness, color, alpha);
        this.edgeGraphics.moveTo(startX, startY);
        this.edgeGraphics.lineTo(endX, endY);

        // Draw arrow head for direction
        this.drawArrowHead(startX, startY, endX, endY, color, alpha);
      }
    }

    this.edgeGraphics.lineStyle(0);
  }

  /**
   * Draw an arrow head to show direction
   */
  private drawArrowHead(
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    color: number,
    alpha: number
  ): void {
    const dx = endX - startX;
    const dy = endY - startY;
    const length = Math.sqrt(dx * dx + dy * dy);

    if (length < 10) return; // Skip very short edges

    // Normalize direction
    const dirX = dx / length;
    const dirY = dy / length;

    // Arrow head size
    const arrowSize = 4;
    const arrowAngle = Math.PI / 6; // 30 degrees

    // Calculate arrow head points
    const arrowX1 =
      endX -
      arrowSize * (dirX * Math.cos(arrowAngle) - dirY * Math.sin(arrowAngle));
    const arrowY1 =
      endY -
      arrowSize * (dirY * Math.cos(arrowAngle) + dirX * Math.sin(arrowAngle));

    const arrowX2 =
      endX -
      arrowSize * (dirX * Math.cos(-arrowAngle) - dirY * Math.sin(-arrowAngle));
    const arrowY2 =
      endY -
      arrowSize * (dirY * Math.cos(-arrowAngle) + dirX * Math.sin(-arrowAngle));

    // Draw arrow head
    this.edgeGraphics.beginFill(color, alpha);
    this.edgeGraphics.moveTo(endX, endY);
    this.edgeGraphics.lineTo(arrowX1, arrowY1);
    this.edgeGraphics.lineTo(arrowX2, arrowY2);
    this.edgeGraphics.lineTo(endX, endY);
    this.edgeGraphics.endFill();
  }

  /**
   * Get debug information
   */
  public getDebugInfo(): {
    visible: boolean;
    nodeCount: number;
    edgeCount: number;
  } {
    const pathfindingService = PathfindingService.getInstance();
    const stats = pathfindingService.getStatistics();

    return {
      visible: this.isVisible,
      nodeCount: stats.totalNodes,
      edgeCount: stats.totalEdges,
    };
  }

  /**
   * Force update the visualization
   */
  public forceUpdate(): void {
    if (this.isVisible) {
      this.updateVisualization();
    }
  }

  /**
   * Clear the visualization
   */
  public clear(): void {
    this.nodeGraphics.clear();
    this.edgeGraphics.clear();
  }
}
