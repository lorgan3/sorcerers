import { Container, Text } from "pixi.js";

const SPEED = -1;
const LIFETIME = 100;

class DamageNumber extends Text {
  lifetime = LIFETIME;

  constructor(amount: number, x: number, y: number) {
    super(`-${Math.ceil(amount)}`, {
      fontFamily: "Eternal",
      fontSize: 32,
      fill: "#f00",
      dropShadow: true,
      dropShadowDistance: 4,
      dropShadowAngle: 45,
    });
    this.anchor.set(0.5);
    this.position.set(x, y);
  }
}

export class DamageNumberContainer extends Container<DamageNumber> {
  tick(dt: number) {
    for (let i = this.children.length - 1; i >= 0; i--) {
      const child = this.children[i];
      child.lifetime -= dt;

      if (child.lifetime <= 0) {
        this.removeChildAt(i);
        continue;
      }

      child.position.y += SPEED * dt;
      child.alpha = Math.max(0.2, child.lifetime / LIFETIME);
    }
  }

  add(amount: number, x: number, y: number) {
    this.addChild(new DamageNumber(amount, x, y));
  }
}
