import { Container } from "pixi.js";
import { SimpleBody } from "../collision/simpleBody";
import { circle3x3 } from "../collision/precomputed/circles";
import { Element } from "./types";
import { getLevel, getManager, getServer } from "../context";
import { ControllableSound } from "../../sound/controllableSound";
import { Sound } from "../../sound";
import { AcidSplash } from "../../graphics/acidSplash";
import { FallDamage, Shape } from "../damage/fallDamage";
import { CollisionMask } from "../collision/collisionMask";
import { TickingEntity } from "../entity/types";

export class AcidDroplet extends Container implements TickingEntity {
  private static timeout = 200;

  public readonly body: SimpleBody;
  private lifetime = AcidDroplet.timeout;
  private hitSomething = false;

  constructor(
    x: number,
    y: number,
    speed: number,
    direction: number,
    collisionMask: CollisionMask
  ) {
    super();

    this.body = new SimpleBody(collisionMask, {
      mask: circle3x3,
      onCollide: this.onCollide,
      friction: 1,
      gravity: 0.04,
      bounciness: 0,
    });
    this.body.move(x, y);
    this.body.addAngularVelocity(speed, direction);
    this.position.set(x * 6, y * 6);

    // const debugSprite = new Sprite(Texture.from(circle3x3Canvas));
    // debugSprite.anchor.set(0);
    // debugSprite.scale.set(6);
    // debugSprite.alpha = 0.5;
    // this.addChild(debugSprite);
    this.visible = false;
  }

  private onCollide = (cx: number, cy: number) => {
    this.hitSomething = true;
    const server = getServer();
    server?.damage(
      new FallDamage(
        cx - 4,
        cy - 4,
        Shape.Acid,
        3 + getManager().getElementValue(Element.Life)
      ),
      server.getActivePlayer()
    );
    this.remove();
  };

  private remove() {
    getLevel().remove(this);
    if (this.hitSomething) {
      new AcidSplash(...this.getCenter());
      ControllableSound.fromEntity(this.getCenter(), Sound.Slime);
    }
  }

  getCenter(): [number, number] {
    return [this.position.x, this.position.y];
  }

  tick(dt: number) {
    this.body.tick(dt);
    const [x, y] = this.body.precisePosition;
    this.position.set(x * 6, y * 6);

    this.lifetime -= dt;
    if (this.lifetime <= 0) {
      this.remove();
    }
  }
}
