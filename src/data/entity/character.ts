import { AnimatedSprite, Container, Sprite, Text, Texture } from "pixi.js";
import { Level } from "../map/level";
import { Body } from "../collision/body";
import { Controller, Key } from "../controller/controller";
import { AssetsContainer } from "../../util/assets/assetsContainer";
import { Player } from "../network/player";
import { Force, TargetList } from "../damage/targetList";
import { HurtableEntity } from "./types";
import { GenericDamage } from "../damage/genericDamage";
import { ExplosiveDamage } from "../damage/explosiveDamage";
import { DamageSource } from "../damage/types";
import { SimpleParticleEmitter } from "../../grapics/particles/simpleParticleEmitter";
import { ParticleEmitter } from "../../grapics/particles/types";
import {
  rectangle6x16,
  rectangle6x16Canvas,
} from "../collision/precomputed/rectangles";
import { Manager } from "../network/manager";
import { TurnState } from "../network/types";
import { ImpactDamage } from "../damage/impactDamage";

// Start bouncing when impact is greater than this value
const BOUNCE_TRIGGER = 5;

const WALK_DURATION = 20;

enum AnimationState {
  Idle = "elf_idle",
  Walk = "elf_walk",
  Jump = "elf_jump",
  Float = "elf_float",
  Land = "elf_land",
  Fall = "elf_fall",
  Spell = "elf_spell",
  SpellIdle = "elf_spellIdle",
  SpellDone = "elf_spellDone",
  Swing = "elf_swing",
}

interface Config {
  name: string;
  loop: boolean;
  speed: number;
}

const ANIMATION_CONFIG: Record<AnimationState, Config> = {
  [AnimationState.Idle]: {
    name: "elf_idle",
    loop: true,
    speed: 0.08,
  },
  [AnimationState.Walk]: {
    name: "elf_walk",
    loop: true,
    speed: 0.1,
  },
  [AnimationState.Jump]: {
    name: "elf_jump",
    loop: false,
    speed: 0.3,
  },
  [AnimationState.Float]: {
    name: "elf_float",
    loop: true,
    speed: 0.1,
  },
  [AnimationState.Land]: {
    name: "elf_land",
    loop: false,
    speed: 0.15,
  },
  [AnimationState.Fall]: {
    name: "elf_fall",
    loop: true,
    speed: 0.1,
  },
  [AnimationState.Spell]: {
    name: "elf_spell",
    loop: false,
    speed: 0.15,
  },
  [AnimationState.SpellIdle]: {
    name: "elf_spellIdle",
    loop: true,
    speed: 0.1,
  },
  [AnimationState.SpellDone]: {
    name: "elf_spell",
    loop: false,
    speed: -0.15,
  },
  [AnimationState.Swing]: {
    name: "elf_swing",
    loop: false,
    speed: 0.25,
  },
};

export class Character extends Container implements HurtableEntity {
  public readonly body: Body;
  public id = -1;

  private sprite: AnimatedSprite;
  private wings: AnimatedSprite;
  private namePlate: Text;
  private particles?: ParticleEmitter;

  private _hp = 100;
  private time = 0;
  private damageSource: DamageSource | null = null;
  private hasWings = false;
  private animationTimer = 0;
  private animationState = AnimationState.Idle;
  private spellSource: any | null = null;

  constructor(
    public readonly player: Player,
    x: number,
    y: number,
    public readonly name: string
  ) {
    super();

    this.body = new Body(Level.instance.terrain.characterMask, {
      mask: rectangle6x16,
      onCollide: this.onCollide,
    });
    this.body.move(x, y);
    Level.instance.terrain.characterMask.add(
      this.body.mask,
      ...this.body.position
    );

    const atlas = AssetsContainer.instance.assets!["atlas"];

    this.sprite = new AnimatedSprite(atlas.animations[this.animationState]);
    this.sprite.animationSpeed = 0.08;
    this.sprite.play();
    this.sprite.anchor.set(0.5, 0.5);
    this.sprite.position.set(18, 28);
    this.sprite.scale.set(2);
    this.sprite.onComplete = () => {
      if (this.animationState === AnimationState.Jump && !this.body.grounded) {
        this.setAnimationState(AnimationState.Float);
      } else if (this.animationState === AnimationState.Spell) {
        this.setAnimationState(AnimationState.SpellIdle);
      } else if (this.animationState === AnimationState.Swing) {
        this.setAnimationState(AnimationState.SpellDone);
        Manager.instance.setTurnState(TurnState.Ending);

        const direction =
          this.sprite.scale.x > 0 ? -Math.PI / 3 : Math.PI + Math.PI / 3;
        const [cx, cy] = this.getCenter();
        Level.instance.damage(
          new ImpactDamage(
            Math.floor(cx / 6) + this.sprite.scale.x * 6,
            Math.floor(cy / 6) - 4,
            direction
          )
        );
      } else {
        this.setAnimationState(AnimationState.Idle);
      }
    };

    const sprite2 = new Sprite(
      Texture.fromBuffer(rectangle6x16Canvas.data, 6, 16)
    );
    sprite2.anchor.set(0);
    sprite2.scale.set(6);
    sprite2.alpha = 0.5;

    this.namePlate = new Text(`${name} ${this._hp}`, {
      fontFamily: "Eternal",
      fontSize: 32,
      fill: this.player.color,
      dropShadow: true,
      dropShadowDistance: 4,
      dropShadowAngle: 45,
    });
    this.namePlate.anchor.set(0.5);
    this.namePlate.position.set(18, -40);

    this.wings = new AnimatedSprite(atlas.animations["wings"]);
    this.wings.scale.set(3);
    this.wings.position.set(18, 28);
    this.wings.anchor.set(0.5);
    this.wings.animationSpeed = 0.2;
    this.wings.visible = false;

    this.addChild(this.wings, this.sprite, this.namePlate);
  }

  private onCollide = (x: number, y: number) => {
    if (
      Math.abs(this.body.xVelocity) > BOUNCE_TRIGGER ||
      Math.abs(this.body.yVelocity) > BOUNCE_TRIGGER
    ) {
      const velocity = this.body.velocity;
      const [x, y] = this.getCenter();

      this.damageSource = new ExplosiveDamage(
        x / 6 + this.body.xVelocity / 2,
        y / 6 + this.body.yVelocity / 2,
        velocity > 8 ? 12 : 8,
        velocity * 0.6,
        2
      );
    }
  };

  private setAnimationState(state: AnimationState, timer?: number) {
    this.animationTimer = timer || 0;

    if (state === this.animationState) {
      return;
    }

    this.animationState = state;
    const config = ANIMATION_CONFIG[state];
    this.sprite.textures =
      AssetsContainer.instance.assets!["atlas"].animations[config.name];
    this.sprite.currentFrame =
      config.speed > 0 ? 0 : this.sprite.totalFrames - 1;
    this.sprite.loop = config.loop;
    this.sprite.animationSpeed = config.speed;
    this.sprite.play();
  }

  getCenter(): [number, number] {
    return [this.position.x + 18, this.position.y + 48];
  }

  tick(dt: number) {
    if (this.animationTimer > 0) {
      this.animationTimer -= dt;

      if (this.animationTimer <= 0) {
        this.setAnimationState(
          this.spellSource ? AnimationState.Spell : AnimationState.Idle
        );
      }
    }

    if (!this.body.grounded && Math.abs(this.body.yVelocity) > 1.5) {
      this.setAnimationState(AnimationState.Float);
    } else if (
      (this.animationState === AnimationState.Fall ||
        this.animationState === AnimationState.Float) &&
      this.body.grounded
    ) {
      this.setAnimationState(AnimationState.Land);
    }

    this.time += dt;
    if (this.time > 3) {
      this.body.active = 1;
    }

    if (this.body.active) {
      this.time = 0;

      Level.instance.terrain.characterMask.subtract(
        this.body.mask,
        ...this.body.position
      );

      if (this.body.tick(dt)) {
        const [x, y] = this.body.precisePosition;
        this.position.set(x * 6, y * 6);

        if (this.damageSource) {
          Level.instance.damage(this.damageSource);
          this.damageSource = null;
        }

        if (
          Level.instance.terrain.killbox.collidesWith(
            this.body.mask,
            this.position.x,
            this.position.y
          )
        ) {
          Level.instance.damage(
            new GenericDamage(new TargetList().add(this, 999))
          );
        }
      }

      Level.instance.terrain.characterMask.add(
        this.body.mask,
        ...this.body.position
      );
    }
  }

  control(controller: Controller) {
    if (
      this.body.grounded &&
      !this.hasWings &&
      (controller.isKeyDown(Key.Up) || controller.isKeyDown(Key.W))
    ) {
      if (this.body.jump()) {
        this.setAnimationState(AnimationState.Jump, 100);
      }
    }
  }

  controlContinuous(dt: number, controller: Controller) {
    this.control(controller);
    const lookDirection = Math.sign(
      controller.getMouse()[0] - this.getCenter()[0]
    );
    this.sprite.scale.x = 2 * lookDirection;

    if (controller.isKeyDown(Key.Left) || controller.isKeyDown(Key.A)) {
      this.body.walk(dt, -1);

      if (this.body.grounded) {
        this.setAnimationState(AnimationState.Walk, WALK_DURATION);

        if (this.sprite.animationSpeed * lookDirection < 0) {
          this.sprite.animationSpeed *= lookDirection;
        }
      }
    }

    if (controller.isKeyDown(Key.Right) || controller.isKeyDown(Key.D)) {
      this.body.walk(dt, 1);

      if (this.body.grounded) {
        this.setAnimationState(AnimationState.Walk, WALK_DURATION);

        if (this.sprite.animationSpeed * lookDirection < 0) {
          this.sprite.animationSpeed *= lookDirection;
        }
      }
    }

    if (this.hasWings) {
      if (
        (controller.isKeyDown(Key.Up) || controller.isKeyDown(Key.W)) &&
        this.body.yVelocity > -1.5
      ) {
        this.body.addVelocity(0, -0.4 * dt);
      }
    }
  }

  damage(damage: number, force?: Force) {
    this.hp -= damage;

    Level.instance.damageNumberContainer.add(damage, ...this.getCenter());

    if (force) {
      this.body.addAngularVelocity(force.power, force.direction);
    }
  }

  setSpellSource(source: any, toggle = true) {
    if (toggle) {
      this.spellSource = source;
      if (this.animationState !== AnimationState.SpellIdle) {
        this.setAnimationState(AnimationState.Spell);
      }
    } else if (source === this.spellSource) {
      this.spellSource = null;
      this.setAnimationState(AnimationState.SpellDone);
    }
  }

  serialize() {
    return this.body.serialize();
  }

  deserialize(data: any[]) {
    Level.instance.terrain.characterMask.subtract(
      this.body.mask,
      ...this.body.position
    );

    this.body.deserialize(data);

    Level.instance.terrain.characterMask.add(
      this.body.mask,
      ...this.body.position
    );
  }

  die() {
    Level.instance.terrain.characterMask.subtract(
      this.body.mask,
      ...this.body.position
    );

    this.player.removeCharacter(this);
  }

  giveWings() {
    this.hasWings = true;
    this.wings.visible = true;
    this.wings.play();

    if (this.particles) {
      Level.instance.particleContainer.destroyEmitter(this.particles, true);
    }

    this.particles = new SimpleParticleEmitter(
      AssetsContainer.instance.assets!["atlas"].animations["spells_sparkle"],
      {
        ...SimpleParticleEmitter.defaultConfig,
        spawnRange: 64,
        spawnFrequency: 0.2,
        initialize: () =>
          Math.random() > 0.5
            ? {
                x: this.position.x - 32,
                y: this.position.y + 60,
                xVelocity: -2,
                yVelocity: 2,
              }
            : {
                x: this.position.x + 86,
                y: this.position.y + 60,
                xVelocity: 2,
                yVelocity: 2,
              },
      }
    );
    Level.instance.particleContainer.addEmitter(this.particles);
  }

  removeWings() {
    if (!this.hasWings) {
      return;
    }

    this.hasWings = false;
    this.wings.visible = false;
    this.wings.stop();

    Level.instance.particleContainer.destroyEmitter(this.particles!);
    this.particles = undefined;
  }

  melee() {
    this.setAnimationState(AnimationState.Swing);
  }

  get hp() {
    return this._hp;
  }

  set hp(hp: number) {
    this._hp = hp;
    this.namePlate.text = `${this.name} ${Math.ceil(this._hp)}`;
    this.body.active = 1;
  }
}
