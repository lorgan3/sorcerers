import { BitmapText, Container, Text, TextStyle } from "pixi.js";

const SPEED = -1;
const LIFETIME = 100;

enum Color {
  Damage = "#ff0000",
  Heal = "#00ff00",
  Mana = "#2a3cff",
}

class DamageNumber extends BitmapText {
  lifetime = LIFETIME;

  constructor(amount: string, x: number, y: number, color: Color) {
    super({
      text: amount,
      style: {
        fontFamily: "Eternal",
        fontSize: 32,
      },
    });
    this.anchor.set(0.5);
    this.position.set(x, y);
    this.tint = color;
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

  private add(amount: string, x: number, y: number, color: Color) {
    this.addChild(new DamageNumber(amount, x, y, color));
  }

  damage(amount: number, x: number, y: number) {
    this.add(`-${Math.ceil(amount)}`, x, y, Color.Damage);
  }

  heal(amount: number, x: number, y: number) {
    this.add(`${Math.ceil(amount)}`, x, y, Color.Heal);
  }

  mana(amount: number, x: number, y: number) {
    this.add(`${Math.ceil(amount)}`, x, y, Color.Mana);
  }
}
