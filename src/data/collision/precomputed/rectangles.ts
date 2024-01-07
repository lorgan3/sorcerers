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

  return ctx.getImageData(0, 0, max, max);
};

const createRectangleCanvas = (dX: number, dY = dX) => {
  const canvas = new OffscreenCanvas(dX, dY);
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#000000";

  ctx.fillRect(0, 0, dX, dY);
  ctx.fill();

  return ctx.getImageData(0, 0, dX, dY);
};

export const rotatedRectangle6x24Canvas = angles.map((angle) =>
  createRotatedRectangleCanvas(angle, 6, 24)
);
export const rotatedRectangle6x24 = rotatedRectangle6x24Canvas.map((canvas) =>
  CollisionMask.fromAlpha(canvas)
);

export const rectangle1x200Canvas = createRectangleCanvas(1, 200);
export const rectangle1x200 = CollisionMask.fromAlpha(rectangle1x200Canvas);
