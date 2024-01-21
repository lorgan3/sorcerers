import { AnimatedSprite, Container } from "pixi.js";
import { Level } from "../map/level";
import { AssetsContainer } from "../../util/assets/assetsContainer";

import { Character } from "../entity/character";

import { CollisionMask } from "../collision/collisionMask";
import { ExplosiveDamage } from "../damage/explosiveDamage";
import { rectangle1x200 } from "../collision/precomputed/rectangles";
import { Manager } from "../network/manager";
import { TurnState } from "../network/types";
import { TickingEntity } from "../entity/types";

const ARCANE_CIRCLES = [0.6, 0.7, 0.5, 0.4, 0.3, 0.2, 1];
const GROW_TIME = 15;
const IMPACT_START_TIME = ARCANE_CIRCLES.length * GROW_TIME + 30;
const EXPLOSION_START_TIME = IMPACT_START_TIME + 15;
const SHRINK_START_TIME = EXPLOSION_START_TIME + 25;
const DONE_TIME = SHRINK_START_TIME + 25;

export class Bakuretsu extends Container implements TickingEntity {
  private arcaneCircles: AnimatedSprite[];
  private impact: AnimatedSprite;
  private explosion: AnimatedSprite;

  private time = 0;
  private exploded = false;
  private rX = 0;
  private rY = 0;

  constructor(x: number, surface: CollisionMask, private character: Character) {
    super();
    character.setSpellSource(this);
    this.rX = Math.round(x);

    let distance = surface.height;
    while (distance > 1) {
      distance /= 2;

      if (
        !surface.collidesWith(
          rectangle1x200,
          this.rX,
          Math.round(this.rY + distance - 200)
        )
      ) {
        this.rY += distance;
      }
    }

    this.rY = Math.round(this.rY);
    this.position.set(this.rX * 6, this.rY * 6);

    const atlas = AssetsContainer.instance.assets!["atlas"];

    this.arcaneCircles = ARCANE_CIRCLES.map((size, i) => {
      const circle = new AnimatedSprite(atlas.animations["spells_magicCircle"]);
      circle.position.y = -i * 100 - 32;
      circle.anchor.set(0.5);
      circle.animationSpeed = 0.3;
      circle.scale.set(size * 1.5);
      circle.tint = 0xff8f7d;
      circle.visible = false;

      return circle;
    });

    this.impact = new AnimatedSprite(atlas.animations["impact"]);
    this.impact.anchor.set(0.5);
    this.impact.animationSpeed = 0.3;
    this.impact.loop = false;
    this.impact.rotation = Math.PI / 2;
    this.impact.scale.set(3);
    this.impact.y = -128 * 3;
    this.impact.visible = false;

    this.explosion = new AnimatedSprite(atlas.animations["spells_fireBomb"]);
    this.explosion.anchor.set(0.5);
    this.explosion.animationSpeed = 0.3;
    this.explosion.loop = false;
    this.explosion.scale.set(5);
    this.explosion.visible = false;

    this.addChild(this.impact, ...this.arcaneCircles, this.explosion);
  }

  tick(dt: number) {
    this.time += dt;

    if (this.time > DONE_TIME) {
      Level.instance.remove(this);
    }

    if (this.time >= SHRINK_START_TIME) {
      for (let circle of this.arcaneCircles) {
        circle.scale.set(circle.scale.x * Math.pow(0.9, dt));
      }

      if (!this.exploded) {
        this.exploded = true;
        Level.instance.shake();
        Level.instance.damage(new ExplosiveDamage(this.rX, this.rY, 32, 6, 10));
        Manager.instance.setTurnState(TurnState.Ending);
        this.character.setSpellSource(this, false);
      }

      return;
    }

    if (this.time >= EXPLOSION_START_TIME) {
      if (!this.explosion.visible) {
        this.explosion.visible = true;
        this.explosion.play();
      }

      return;
    }

    if (this.time >= IMPACT_START_TIME) {
      if (!this.impact.visible) {
        this.impact.visible = true;
        this.impact.play();
      }

      return;
    }

    for (
      let i = 0;
      i < this.time / GROW_TIME && i < ARCANE_CIRCLES.length;
      i++
    ) {
      const circle = this.arcaneCircles[i];

      circle.scale.x = circle.scale.y * Math.min(1, this.time / GROW_TIME - i);

      if (!circle.visible) {
        circle.visible = true;
        circle.play();
      }
    }
  }

  static cast(x: number, y: number, character: Character) {
    const entity = new Bakuretsu(
      x,
      Level.instance.terrain.collisionMask,
      character
    );

    Level.instance.add(entity);
    return entity;
  }
}
