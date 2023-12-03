import { CollisionMask } from "../collisionMask";

const createCircleCanvas = (d: number) => {
  const canvas = new OffscreenCanvas(d, d);
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#000000";
  ctx.ellipse(d / 2, d / 2, d / 2, d / 2, 0, 0, Math.PI * 2);
  ctx.fill();

  return ctx.getImageData(0, 0, d, d);
};

export const circle3x3Canvas = createCircleCanvas(3);
export const circle3x3 = CollisionMask.fromAlpha(circle3x3Canvas);

export const circle9x9Canvas = createCircleCanvas(9);
export const circle9x9 = CollisionMask.fromAlpha(circle9x9Canvas);

export const circle32x32Canvas = createCircleCanvas(32);
export const circle32x32 = CollisionMask.fromAlpha(circle32x32Canvas);
