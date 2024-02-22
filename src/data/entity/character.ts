import {
  AnimatedSprite,
  BitmapText,
  Container,
  Sprite,
  Texture,
} from "pixi.js";
import { Level } from "../map/level";
import { Body } from "../collision/body";
import { Controller, Key } from "../controller/controller";
import { AssetsContainer } from "../../util/assets/assetsContainer";
import { Player } from "../network/player";
import { Force, TargetList } from "../damage/targetList";
import { EntityType, HurtableEntity, Priority, Syncable } from "./types";
import { GenericDamage } from "../damage/genericDamage";
import { ExplosiveDamage } from "../damage/explosiveDamage";
import { DamageSource } from "../damage/types";
import { SimpleParticleEmitter } from "../../graphics/particles/simpleParticleEmitter";
import { ParticleEmitter } from "../../graphics/particles/types";
import {
  rectangle6x16,
  rectangle6x16Canvas,
} from "../collision/precomputed/rectangles";
import { Manager } from "../network/manager";
import { TurnState } from "../network/types";
import { ImpactDamage } from "../damage/impactDamage";
import { Animation, Animator } from "../../graphics/animator";
import { Element } from "../spells/types";
import {
  createBackgroundParticles,
  createWandParticles,
} from "../../graphics/particles/factory/character";
import { createCharacterGibs } from "./gib/characterGibs";
import { Explosion } from "../../graphics/explosion";
import { ControllableSound } from "../../sound/controllableSound";
import { Sound } from "../../sound";

// Start bouncing when impact is greater than this value
const BOUNCE_TRIGGER = 4;

const WALK_DURATION = 20;
const MELEE_DURATION = 50;

const MELEE_POWER = 20;

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

const ANIMATION_CONFIG: Record<
  AnimationState,
  Animation<AnimationState, Character>
> = {
  [AnimationState.Idle]: {
    name: "elf_idle",
    loop: true,
    speed: 0.08,
  },
  [AnimationState.Walk]: {
    name: "elf_walk",
    loop: true,
    speed: 0.1,
    continuous: (entity) => {
      ControllableSound.fromEntity(entity, Sound.Step);
      return 22 + Math.random() * 5;
    },
    duration: WALK_DURATION,
  },
  [AnimationState.Jump]: {
    name: "elf_jump",
    loop: false,
    speed: 0.3,
    nextState: AnimationState.Float,
    onStart: (entity) => ControllableSound.fromEntity(entity, Sound.Jump),
  },
  [AnimationState.Float]: {
    name: "elf_float",
    loop: true,
    speed: 0.1,
    available: (entity) => !entity.body.grounded,
  },
  [AnimationState.Land]: {
    name: "elf_land",
    loop: false,
    speed: 0.15,
    onStart: (entity) => ControllableSound.fromEntity(entity, Sound.Land),
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
    nextState: AnimationState.SpellIdle,
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
    nextState: AnimationState.SpellDone,
    blocking: true,
    duration: MELEE_DURATION,
    continuous: (entity, time) => {
      if (time > 0) {
        ControllableSound.fromEntity(entity, Sound.Swing);
      }

      return 30;
    },
  },
};

export class Character extends Container implements HurtableEntity, Syncable {
  public readonly body: Body;
  public id = -1;
  public readonly priority = Priority.Low;
  public readonly type = EntityType.Character;

  private sprite: AnimatedSprite;
  private wings: AnimatedSprite;
  private namePlate: BitmapText;
  private particles?: ParticleEmitter;
  private foregroundParticles?: ParticleEmitter;

  private _hp = 100;
  private time = 0;
  private damageSource: DamageSource | null = null;
  private hasWings = false;
  private animationTimer = 0;
  private spellSource: any | null = null;
  private lookDirection = 1;

  private animator: Animator<AnimationState>;

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
    this.position.set(x * 6, y * 6);
    Level.instance.terrain.characterMask.add(
      this.body.mask,
      ...this.body.position
    );

    const atlas = AssetsContainer.instance.assets!["atlas"];

    this.animator = new Animator<AnimationState>(atlas.animations, this)
      .addAnimations(ANIMATION_CONFIG)
      .addAnimation(AnimationState.SpellIdle, {
        ...ANIMATION_CONFIG[AnimationState.SpellIdle],
        onStart: () => {
          this.particles = Level.instance.backgroundParticles.replaceEmitter(
            createBackgroundParticles(this),
            this.particles
          );
          this.foregroundParticles =
            Level.instance.particleContainer.replaceEmitter(
              createWandParticles(this),
              this.foregroundParticles
            );
        },
        onEnd: () => {
          this.particles = Level.instance.backgroundParticles.destroyEmitter(
            this.particles!
          );
          this.foregroundParticles =
            Level.instance.particleContainer.destroyEmitter(
              this.foregroundParticles!
            );
        },
      })
      .addAnimation(AnimationState.Swing, {
        ...ANIMATION_CONFIG[AnimationState.Swing],
        onEnd: () => {
          const direction =
            this.sprite.scale.x > 0 ? -Math.PI / 3 : Math.PI + Math.PI / 3;
          const [cx, cy] = this.getCenter();
          Level.instance.damage(
            new ImpactDamage(
              Math.round(cx / 6) + this.sprite.scale.x * 6.5,
              Math.round(cy / 6) - 6,
              direction,
              MELEE_POWER * Manager.instance.getElementValue(Element.Physical)
            )
          );

          this.animator.animate(AnimationState.SpellDone);
          Manager.instance.setTurnState(TurnState.Ending);
        },
      });

    this.sprite = this.animator.sprite;
    this.sprite.anchor.set(0.5, 0.5);
    this.sprite.position.set(18, 28);
    this.sprite.scale.set(2);

    const sprite2 = new Sprite(
      Texture.fromBuffer(rectangle6x16Canvas.data, 6, 16)
    );
    sprite2.anchor.set(0);
    sprite2.scale.set(6);
    sprite2.alpha = 0.5;

    this.namePlate = new BitmapText(`${name} ${this._hp}`, {
      fontName: "Eternal",
      tint: this.player.color,
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
        velocity * 0.5,
        1.5
      );
    }
  };

  getCenter(): [number, number] {
    return [this.position.x + 18, this.position.y + 48];
  }

  tick(dt: number) {
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

    this.animator.tick(dt);

    if (!this.body.grounded && Math.abs(this.body.yVelocity) > 2) {
      this.animator.animate(AnimationState.Float);
    } else if (
      (this.animator.animationState === AnimationState.Fall ||
        this.animator.animationState === AnimationState.Float) &&
      this.body.grounded
    ) {
      this.animator.animate(AnimationState.Land);
    }
  }

  control(controller: Controller) {
    if (
      this.body.grounded &&
      !this.hasWings &&
      (controller.isKeyDown(Key.Up) || controller.isKeyDown(Key.W))
    ) {
      if (this.body.jump()) {
        this.animator.animate(AnimationState.Jump);
      }
    }
  }

  controlContinuous(dt: number, controller: Controller) {
    if (this.animator.isBlocking) {
      return;
    }

    this.control(controller);
    this.lookDirection = Math.sign(
      controller.getMouse()[0] - this.getCenter()[0]
    );
    this.sprite.scale.x = 2 * this.lookDirection;

    if (controller.isKeyDown(Key.Left) || controller.isKeyDown(Key.A)) {
      this.body.walk(dt, -1);

      if (this.body.grounded) {
        this.animator.animate(AnimationState.Walk);

        if (this.sprite.animationSpeed * this.lookDirection < 0) {
          this.sprite.animationSpeed *= this.lookDirection;
        }
      }
    }

    if (controller.isKeyDown(Key.Right) || controller.isKeyDown(Key.D)) {
      this.body.walk(dt, 1);

      if (this.body.grounded) {
        this.animator.animate(AnimationState.Walk);

        if (this.sprite.animationSpeed * this.lookDirection < 0) {
          this.sprite.animationSpeed *= this.lookDirection;
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

  damage(source: DamageSource, damage: number, force?: Force) {
    this.hp -= damage;

    Level.instance.bloodEmitter.burst(this, damage, source);
    ControllableSound.fromEntity(this, Sound.Splat);

    if (force) {
      this.body.addAngularVelocity(force.power, force.direction);
    }
  }

  setSpellSource(source: any, toggle = true) {
    if (toggle) {
      this.spellSource = source;

      if (this.animator.animationState !== AnimationState.SpellIdle) {
        this.animator.animate(AnimationState.Spell);
      }

      this.animator.setDefaultAnimation(AnimationState.Spell);
    } else if (source === this.spellSource) {
      this.spellSource = null;
      this.animator.animate(AnimationState.SpellDone);
      this.animator.setDefaultAnimation(AnimationState.Idle);
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

  serializeCreate() {
    throw new Error("Method not implemented.");
  }

  static create(_: any): Character {
    throw new Error("Method not implemented.");
  }

  die() {
    Level.instance.terrain.characterMask.subtract(
      this.body.mask,
      ...this.body.position
    );

    this.player.removeCharacter(this);

    const [x, y] = this.getCenter();
    new Explosion(x, y);
    Level.instance.shake();
    Level.instance.damage(new ExplosiveDamage(x / 6, y / 6, 16, 1, 1));

    const gibs = createCharacterGibs(...this.body.precisePosition);
    gibs.forEach((gib) =>
      gib.body.addVelocity((Math.random() - 0.5) * 12, -Math.random() * 6)
    );
    Level.instance.add(...gibs);
    Level.instance.bloodEmitter.burst(this, 100);

    Level.instance.terrain.draw((ctx) => {
      const splat =
        AssetsContainer.instance.assets!["atlas"].textures["elf_splat"];

      ctx.drawImage(
        splat.baseTexture.resource.source,
        splat.frame.left,
        splat.frame.top,
        splat.frame.width,
        splat.frame.height,
        x / 6 - splat.frame.width / 2,
        y / 6 - splat.frame.height / 2 + 5,
        splat.frame.width,
        splat.frame.height
      );
    });
  }

  giveWings() {
    this.hasWings = true;
    this.wings.visible = true;
    this.wings.play();

    this.foregroundParticles = Level.instance.particleContainer.replaceEmitter(
      new SimpleParticleEmitter(
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
      ),
      this.foregroundParticles
    );
  }

  removeWings() {
    if (!this.hasWings) {
      return;
    }

    this.hasWings = false;
    this.wings.visible = false;
    this.wings.stop();

    this.foregroundParticles = Level.instance.particleContainer.destroyEmitter(
      this.foregroundParticles!
    );
  }

  melee() {
    this.animationTimer = MELEE_DURATION;
    this.animator.animate(AnimationState.Swing);
  }

  get hp() {
    return this._hp;
  }

  set hp(hp: number) {
    const oldHp = this._hp;
    const diff = hp - oldHp;
    if (diff > 0) {
      Level.instance.numberContainer.heal(diff, ...this.getCenter());
    } else if (diff < 0) {
      Level.instance.numberContainer.damage(diff, ...this.getCenter());
    }

    this._hp = hp;
    this.namePlate.text = `${this.name} ${Math.max(0, Math.ceil(this._hp))}`;
    this.body.active = 1;
  }

  get direction() {
    return this.lookDirection;
  }
}
