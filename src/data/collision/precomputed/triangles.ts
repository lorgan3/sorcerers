import { CollisionMask } from "../collisionMask";

export const swordTipCanvas = new OffscreenCanvas(11, 10);
const ctx1 = swordTipCanvas.getContext("2d")!;
ctx1.fillStyle = "#000000";
ctx1.fillRect(0, 0, 11, 5);
ctx1.moveTo(0, 5);
ctx1.lineTo(11, 5);
ctx1.lineTo(6, 10);
ctx1.lineTo(5, 10);
ctx1.lineTo(0, 5);
ctx1.fill();

export const swordTip = CollisionMask.fromAlpha(
  ctx1.getImageData(0, 0, 11, 10)
);

export const smallSwordTipCanvas = new OffscreenCanvas(3, 6);
const ctx2 = smallSwordTipCanvas.getContext("2d")!;
ctx2.fillStyle = "#000000";
ctx2.fillRect(0, 0, 3, 4);
ctx2.moveTo(0, 4);
ctx2.lineTo(3, 4);
ctx2.lineTo(1, 6);
ctx2.lineTo(0, 4);
ctx2.fill();

export const smallSwordTip = CollisionMask.fromAlpha(
  ctx2.getImageData(0, 0, 3, 6)
);
