import { CollisionMask } from "../collisionMask";

const createEllipseCanvas = (dX: number, dY = dX) => {
  const canvas = new OffscreenCanvas(dX, dY);
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#000000";
  ctx.ellipse(dX / 2, dY / 2, dX / 2, dY / 2, 0, 0, Math.PI * 2);
  ctx.fill();

  return ctx.getImageData(0, 0, dX, dY);
};

export const circle3x3Canvas = createEllipseCanvas(3);
export const circle3x3 = CollisionMask.fromAlpha(circle3x3Canvas);

export const circle9x9Canvas = createEllipseCanvas(9);
export const circle9x9 = CollisionMask.fromAlpha(circle9x9Canvas);

export const ellipse9x16Canvas = createEllipseCanvas(9, 16);
export const ellipse9x16 = CollisionMask.fromAlpha(ellipse9x16Canvas);

export const circle16x16Canvas = createEllipseCanvas(16);
export const circle16x16 = CollisionMask.fromAlpha(circle16x16Canvas);

export const circle24x24Canvas = createEllipseCanvas(24);
export const circle24x24 = CollisionMask.fromAlpha(circle24x24Canvas);

export const circle32x32Canvas = createEllipseCanvas(32);
export const circle32x32 = CollisionMask.fromAlpha(circle32x32Canvas);
