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
import { Wings } from "./wings";
import { SmokePuff } from "../../graphics/smokePuff";

// Start bouncing when impact is greater than this value
const BOUNCE_TRIGGER = 3.8;
const SMOKE_TRIGGER = 2;

const WALK_DURATION = 20;
const MELEE_DURATION = 50;
const PAGE_READ_DURATION = 60;

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
  Read = "elf_read",
  ReadIdle = "elf_readIdle",
  ReadDone = "elf_readDone",
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
  [AnimationState.Read]: {
    name: "elf_read",
    loop: false,
    speed: 0.15,
    nextState: AnimationState.ReadIdle,
  },
  [AnimationState.ReadIdle]: {
    name: "elf_readIdle",
    loop: false,
    nextState: AnimationState.ReadIdle,
    duration: PAGE_READ_DURATION,
    speed: 0.1,
  },
  [AnimationState.ReadDone]: {
    name: "elf_read",
    loop: false,
    speed: -0.15,
  },
};

export class Character extends Container implements HurtableEntity, Syncable {
  public readonly body: Body;
  public id = -1;
  public readonly priority = Priority.Low;
  public readonly type = EntityType.Character;

  private sprite: AnimatedSprite;
  private namePlate: BitmapText;
  private particles?: ParticleEmitter;
  private foregroundParticles?: ParticleEmitter;

  private _hp = 100;
  private time = 0;
  private damageSource: DamageSource | null = null;
  private spellSource: any | null = null;
  private lookDirection = 1;
  private wings?: Wings;

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
              Math.floor(cx / 6) + this.sprite.scale.x * 6.5,
              Math.floor(cy / 6) - 6,
              direction,
              MELEE_POWER *
                (0.7 + Manager.instance.getElementValue(Element.Physical) * 0.3)
            )
          );

          this.animator.animate(AnimationState.SpellDone);
          Manager.instance.setTurnState(TurnState.Ending);
        },
      })
      .addAnimation(AnimationState.ReadIdle, {
        ...ANIMATION_CONFIG[AnimationState.ReadIdle],
        continuous: () => {
          if (
            (Manager.instance.getActiveCharacter() !== this ||
              !this.player.controller.isKeyDown()) &&
            !this.spellSource
          ) {
            this.animator.animate(AnimationState.ReadDone);
          }

          return 30;
        },
        onEnd: () => {
          if (!player.controller.isKeyDown(Key.Inventory)) {
            this.animator.setDefaultAnimation(AnimationState.Idle);
          }
        },
      });

    this.sprite = this.animator.sprite;
    this.sprite.anchor.set(0.5, 0.5);
    this.sprite.position.set(18, 28);
    this.sprite.scale.set(2);

    const sprite2 = new Sprite(Texture.from(rectangle6x16Canvas));
    sprite2.anchor.set(0);
    sprite2.scale.set(6);
    sprite2.alpha = 0.5;

    this.namePlate = new BitmapText(`${name} ${this._hp}`, {
      fontName: "Eternal",
      tint: this.player.color,
    });
    this.namePlate.anchor.set(0.5);
    this.namePlate.position.set(18, -40);

    this.addChild(this.sprite, this.namePlate);
  }

  private onCollide = (x: number, y: number) => {
    if (this.body.yVelocity > SMOKE_TRIGGER && this.body.grounded) {
      Level.instance.add(new SmokePuff(x * 6 + 18, y * 6 + 72));
    }

    if (
      Math.abs(this.body.xVelocity) > BOUNCE_TRIGGER ||
      Math.abs(this.body.yVelocity) > BOUNCE_TRIGGER
    ) {
      const velocity = this.body.velocity;

      this.damageSource = new ExplosiveDamage(
        x + 3,
        y + 8 + this.body.yVelocity,
        velocity > 8 ? 12 : 8,
        Math.min(2.5, velocity * 0.5),
        Math.max(1, velocity - 3) ** 2
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
          this._hp > 0 &&
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

  move(x: number, y: number) {
    Level.instance.terrain.characterMask.subtract(
      this.body.mask,
      ...this.body.position
    );

    this.body.move(x, y);

    Level.instance.terrain.characterMask.add(
      this.body.mask,
      ...this.body.position
    );
  }

  control(controller: Controller) {
    if (
      this.body.grounded &&
      !this.wings &&
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

    if (
      this.wings &&
      (controller.isKeyDown(Key.Up) || controller.isKeyDown(Key.W))
    ) {
      this.wings.flap();
      this.animator.animate(AnimationState.Float);

      if (this.wings.power <= 0) {
        this.removeWings();
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

      if (
        Manager.instance.getActiveCharacter() === this &&
        this.player.controller.isKeyDown(Key.Inventory)
      ) {
        this.animator.setDefaultAnimation(AnimationState.Read);
      } else {
        this.animator.setDefaultAnimation(AnimationState.Idle);
      }
    }
  }

  openSpellBook() {
    if (
      !this.spellSource &&
      this.animator.animationState !== AnimationState.Read &&
      this.animator.animationState !== AnimationState.ReadIdle
    ) {
      this.animator.animate(AnimationState.Read);
      this.animator.setDefaultAnimation(AnimationState.Read);
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

    Level.instance.damage(new ExplosiveDamage(x / 6, y / 6, 16, 1, 1));
  }

  giveWings() {
    this.wings = new Wings(this);
    this.addChildAt(this.wings, 0);
  }

  removeWings() {
    if (!this.wings) {
      return;
    }

    this.wings.stop();
    this.removeChild(this.wings);
    this.wings = undefined;
  }

  melee() {
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
