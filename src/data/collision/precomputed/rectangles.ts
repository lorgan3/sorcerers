import { CollisionMask } from "../collisionMask";
import { angles } from "../util";

const createRotatedRectangleCanvas = (angle: number, dX: number, dY = dX) => {
  const max = Math.max(dX, dY);

  const canvas = new OffscreenCanvas(max, max);
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#000000";
  ctx.translate(max / 2, max / 2);
  ctx.rotate(angle);
  ctx.fillRect(-dX / 2, -dY / 2, dX, dY);
  ctx.fill();

  return canvas;
};

const createRectangleCanvas = (dX: number, dY = dX) => {
  const canvas = new OffscreenCanvas(dX, dY);
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#000000";

  ctx.fillRect(0, 0, dX, dY);
  ctx.fill();

  return ctx.getImageData(0, 0, dX, dY);
};

export const rotatedRectangle2x24Canvas = angles.map((angle) =>
  createRotatedRectangleCanvas(angle, 2, 24)
);
export const rotatedRectangle2x24 = rotatedRectangle2x24Canvas.map((canvas) =>
  CollisionMask.fromAlpha(canvas.getContext("2d")!.getImageData(0, 0, 24, 24))
);

export const rotatedRectangle4x24Canvas = angles.map((angle) =>
  createRotatedRectangleCanvas(angle, 4, 24)
);
export const rotatedRectangle4x24 = rotatedRectangle4x24Canvas.map((canvas) =>
  CollisionMask.fromAlpha(canvas.getContext("2d")!.getImageData(0, 0, 24, 24))
);

export const rotatedRectangle6x24Canvas = angles.map((angle) =>
  createRotatedRectangleCanvas(angle, 6, 24)
);
export const rotatedRectangle6x24 = rotatedRectangle6x24Canvas.map((canvas) =>
  CollisionMask.fromAlpha(canvas.getContext("2d")!.getImageData(0, 0, 24, 24))
);

export const rectangle1x200Canvas = createRectangleCanvas(1, 200);
export const rectangle1x200 = CollisionMask.fromAlpha(rectangle1x200Canvas);

export const rectangle6x16Canvas = createRectangleCanvas(6, 16);
export const rectangle6x16 = CollisionMask.fromAlpha(rectangle6x16Canvas);
