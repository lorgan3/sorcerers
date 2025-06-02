import { Key } from "../controller/controller";

export interface Point {
  x: number;
  y: number;
}

export interface PathNode {
  x: number; // Grid position
  y: number; // Grid position
  type: "ground" | "ladder" | "air";
  connections: PathEdge[];
  id: string; // Unique identifier for the node
}

export interface PathEdge {
  target: PathNode;
  movementType: "walk" | "jump" | "climb" | "fall";
  cost: number; // Movement cost for A*
  requiredInputs: Key[]; // Keys needed to execute this movement
  duration?: number; // Estimated time to complete this movement
}

export interface MovementCommand {
  keys: Key[];
  duration: number;
  waitForCondition?: (character: any) => boolean;
}

export interface PathResult {
  path: PathNode[];
  commands: MovementCommand[];
  totalCost: number;
  success: boolean;
}

export interface TerrainGraphOptions {
  jumpHeight?: number; // Maximum jump height in grid units
  jumpDistance?: number; // Maximum horizontal jump distance
  walkSpeed?: number; // Walking speed for cost calculation
  jumpCost?: number; // Base cost for jumping
  climbCost?: number; // Base cost for climbing
  fallCost?: number; // Base cost for falling
}

export interface GraphNode {
  position: Point;
  type: "ground" | "ladder" | "air";
  neighbors: GraphEdge[];
  walkable: boolean;
  onLadder: boolean;
}

export interface GraphEdge {
  to: GraphNode;
  movementType: "walk" | "jump" | "climb" | "fall";
  cost: number;
  requiredKeys: Key[];
  estimatedDuration: number;
}

// Physics constants from the character system
export const PHYSICS_CONSTANTS = {
  GRAVITY: 0.2,
  JUMP_STRENGTH: 3.3,
  SPEED: 0.08,
  LADDER_SPEED: 0.6,
  CHARACTER_WIDTH: 6,
  CHARACTER_HEIGHT: 16,
  MAX_JUMP_HEIGHT: 20, // Estimated based on jump strength and gravity
  MAX_JUMP_DISTANCE: 10, // Estimated horizontal jump reach
} as const;
