import { CollisionMask } from "../collisionMask";

const createEllipseCanvas = (dX: number, dY = dX) => {
  const canvas = new OffscreenCanvas(dX, dY);
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#000000";
  ctx.ellipse(dX / 2, dY / 2, dX / 2, dY / 2, 0, 0, Math.PI * 2);
  ctx.fill();

  return [
    canvas,
    CollisionMask.fromAlpha(ctx.getImageData(0, 0, dX, dY)),
  ] as const;
};

export const [circle3x3Canvas, circle3x3] = createEllipseCanvas(3);

export const [circle9x9Canvas, circle9x9] = createEllipseCanvas(9);

export const [ellipse9x16Canvas, ellipse9x16] = createEllipseCanvas(9, 16);

export const [circle16x16Canvas, circle16x16] = createEllipseCanvas(16);

export const [circle24x24Canvas, circle24x24] = createEllipseCanvas(24);

export const [circle30x30Canvas, circle30x30] = createEllipseCanvas(30);

export const [circle32x32Canvas, circle32x32] = createEllipseCanvas(32);

export const [circle64x64Canvas, circle64x64] = createEllipseCanvas(64);
