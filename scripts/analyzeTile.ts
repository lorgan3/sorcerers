/**
 * Analyze a WFC tile PNG image for import into tiles.ts.
 *
 * Usage: npx tsx scripts/analyzeTile.ts <path-to-png>
 *
 * Outputs JSON with:
 * - dimensions, validity (80x80, only black/transparent pixels)
 * - density (ratio of opaque pixels)
 * - per-edge solid ratios and suggested socket types
 */

import { Jimp } from "jimp";
import path from "path";

const TILE_SIZE = 80;

type SocketSuggestion =
  | "SOLID"
  | "EMPTY"
  | "SURFACE_LOW"
  | "SURFACE_HIGH"
  | "DOUBLE_SURFACE"
  | "UNKNOWN";

interface EdgeAnalysis {
  solidRatio: number;
  suggestion: SocketSuggestion;
  /** For vertical edges: where solid pixels are distributed (0=top, 1=bottom) */
  solidCenter: number;
  /** Whether there are multiple separate solid regions */
  hasMultipleRegions: boolean;
}

interface TileAnalysis {
  file: string;
  id: string;
  valid: boolean;
  errors: string[];
  width: number;
  height: number;
  density: number;
  edges: {
    top: EdgeAnalysis;
    right: EdgeAnalysis;
    bottom: EdgeAnalysis;
    left: EdgeAnalysis;
  };
}

function isValidPixel(r: number, g: number, b: number, a: number): boolean {
  if (a === 0) return true; // fully transparent
  if (r === 0 && g === 0 && b === 0 && a === 255) return true; // black opaque
  return false;
}

function analyzeEdge(
  pixels: { r: number; g: number; b: number; a: number }[],
): EdgeAnalysis {
  const n = pixels.length;
  const solid = pixels.map((p) => p.a > 128);
  const solidCount = solid.filter(Boolean).length;
  const solidRatio = solidCount / n;

  if (solidRatio >= 0.95) {
    return { solidRatio, suggestion: "SOLID", solidCenter: 0.5, hasMultipleRegions: false };
  }
  if (solidRatio <= 0.05) {
    return { solidRatio, suggestion: "EMPTY", solidCenter: 0.5, hasMultipleRegions: false };
  }

  // Find center of mass of solid pixels (0=start, 1=end)
  let weightedSum = 0;
  for (let i = 0; i < n; i++) {
    if (solid[i]) weightedSum += i;
  }
  const solidCenter = weightedSum / solidCount / (n - 1);

  // Count separate solid regions (transitions from empty to solid)
  let regions = 0;
  for (let i = 0; i < n; i++) {
    if (solid[i] && (i === 0 || !solid[i - 1])) regions++;
  }
  const hasMultipleRegions = regions >= 2;

  let suggestion: SocketSuggestion;
  if (hasMultipleRegions) {
    suggestion = "DOUBLE_SURFACE";
  } else if (solidCenter > 0.6) {
    // Solid pixels concentrated toward the end (bottom for vertical, right for horizontal)
    suggestion = "SURFACE_LOW";
  } else if (solidCenter < 0.4) {
    suggestion = "SURFACE_HIGH";
  } else {
    suggestion = "UNKNOWN";
  }

  return { solidRatio, suggestion, solidCenter, hasMultipleRegions };
}

async function analyze(filePath: string): Promise<TileAnalysis> {
  const id = path.basename(filePath, ".png").replace(/^placeholder-/, "");
  const errors: string[] = [];

  const image = await Jimp.read(filePath);
  const width = image.width;
  const height = image.height;

  if (width !== TILE_SIZE || height !== TILE_SIZE) {
    errors.push(`Expected ${TILE_SIZE}x${TILE_SIZE}, got ${width}x${height}`);
  }

  // Validate pixels and calculate density
  let opaqueCount = 0;
  let invalidPixels = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const color = image.getPixelColor(x, y);
      const r = (color >> 24) & 0xff;
      const g = (color >> 16) & 0xff;
      const b = (color >> 8) & 0xff;
      const a = color & 0xff;

      if (a > 128) opaqueCount++;
      if (!isValidPixel(r, g, b, a)) invalidPixels++;
    }
  }

  if (invalidPixels > 0) {
    errors.push(
      `${invalidPixels} pixels are neither black-opaque nor transparent`,
    );
  }

  const density = opaqueCount / (width * height);

  // Analyze edges
  const getPixel = (x: number, y: number) => {
    const color = image.getPixelColor(x, y);
    return {
      r: (color >> 24) & 0xff,
      g: (color >> 16) & 0xff,
      b: (color >> 8) & 0xff,
      a: color & 0xff,
    };
  };

  const topPixels = Array.from({ length: width }, (_, x) => getPixel(x, 0));
  const bottomPixels = Array.from({ length: width }, (_, x) =>
    getPixel(x, height - 1),
  );
  const leftPixels = Array.from({ length: height }, (_, y) => getPixel(0, y));
  const rightPixels = Array.from({ length: height }, (_, y) =>
    getPixel(width - 1, y),
  );

  return {
    file: filePath,
    id,
    valid: errors.length === 0,
    errors,
    width,
    height,
    density: Math.round(density * 1000) / 1000,
    edges: {
      top: analyzeEdge(topPixels),
      right: analyzeEdge(rightPixels),
      bottom: analyzeEdge(bottomPixels),
      left: analyzeEdge(leftPixels),
    },
  };
}

const filePath = process.argv[2];
if (!filePath) {
  console.error("Usage: npx tsx scripts/analyzeTile.ts <path-to-png>");
  process.exit(1);
}

analyze(filePath)
  .then((result) => console.log(JSON.stringify(result, null, 2)))
  .catch((err) => {
    console.error("Error analyzing tile:", err.message);
    process.exit(1);
  });
