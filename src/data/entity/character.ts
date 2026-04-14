import {
  AnimatedSprite,
  BitmapText,
  Container,
  Sprite,
  Texture,
} from "pixi.js";
import { Body } from "../collision/body";
import { Controller, Key } from "../controller/controller";
import { AssetsContainer } from "../../util/assets/assetsContainer";
import { Player } from "../network/player";
import { Force, TargetList } from "../damage/targetList";
import { EntityType, HurtableEntity, Priority, Syncable } from "./types";
import { GenericDamage } from "../damage/genericDamage";
import { DamageSource } from "../damage/types";
import { ParticleEmitter } from "../../graphics/particles/types";
import {
  rectangle6x16,
  rectangle6x16Canvas,
} from "../collision/precomputed/rectangles";
import { TurnState } from "../network/types";
import { ImpactDamage } from "../damage/impactDamage";
import { Animation, Animator } from "../../graphics/animator";
import { Element } from "../spells/types";
import {
  createBackgroundParticles,
  createWandParticles,
} from "../../graphics/particles/factory/character";
import { ControllableSound } from "../../sound/controllableSound";
import { Sound } from "../../sound";
import { SmokePuff } from "../../graphics/smokePuff";
import { COLORS } from "../network/constants";
import { getLevel, getManager, getServer } from "../context";
import { CharacterHealth } from "./characterHealth";
import { CharacterCombat } from "./characterCombat";
import { CharacterMovement } from "./characterMovement";

// Start bouncing when impact is greater than this value
const BOUNCE_TRIGGER = 3.8;
const SMOKE_TRIGGER = 2;
const WALK_DURATION = 20;
const MELEE_DURATION = 50;
const PAGE_READ_DURATION = 60;
const CLIMB_DURATION = 10;

const MELEE_POWER = 20;

const MAX_NAME_LENGTH = 30;

export enum AnimationState {
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
  Climb = "elf_climb",
  ClimbIdle = "elf_climbIdle",
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
    available: (entity) => !entity.body.grounded && !entity.body.onLadder,
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
  [AnimationState.Climb]: {
    name: "elf_climb",
    loop: true,
    speed: 0.06,
    nextState: AnimationState.ClimbIdle,
    continuous: (entity) => {
      ControllableSound.fromEntity(entity, Sound.LadderClimb);
      return 22 + Math.random() * 5;
    },
    duration: CLIMB_DURATION,
  },
  [AnimationState.ClimbIdle]: {
    name: "elf_climb",
    loop: false,
    speed: 0,
  },
};

export class Character extends Container implements HurtableEntity, Syncable {
  private static readonly maxInactiveTime = 3;

  public readonly body: Body;
  private readonly health: CharacterHealth;
  public id = -1;
  public readonly priority = Priority.Low;
  public readonly type = EntityType.Character;

  private sprite: AnimatedSprite;
  private namePlate: BitmapText;
  private particles?: ParticleEmitter;
  private foregroundParticles?: ParticleEmitter;

  private _time = 0;
  private lastActiveTime = 0;
  private lookDirection = 1;
  private namePlateName: string;
  public readonly combat: CharacterCombat;
  public readonly movement: CharacterMovement;

  private animator: Animator<AnimationState>;

  constructor(
    public readonly player: Player,
    x: number,
    y: number,
    public readonly characterName: string,
  ) {
    super();

    this.namePlateName =
      characterName.length > MAX_NAME_LENGTH
        ? characterName.slice(0, MAX_NAME_LENGTH - 3) + "..."
        : characterName;

    this.combat = new CharacterCombat(this);
    this.movement = new CharacterMovement(this);
    this.body = new Body(getLevel().terrain.characterMask, {
      mask: rectangle6x16,
      onCollide: this.onCollide,
      ladderTest: this.movement.ladderTest,
    });
    this.body.move(x, y);
    this.position.set(x * 6, y * 6);
    getLevel().terrain.characterMask.add(this.body.mask, ...this.body.position);

    const atlas = AssetsContainer.instance.assets!["characters"];

    this.animator = new Animator<AnimationState>(
      atlas.animations,
      this,
      `_${COLORS.indexOf(this.player.color)}`,
    )
      .addAnimations(ANIMATION_CONFIG)
      .addAnimation(AnimationState.SpellIdle, {
        ...ANIMATION_CONFIG[AnimationState.SpellIdle],
        onStart: () => {
          this.particles = getLevel().backgroundParticles.replaceEmitter(
            createBackgroundParticles(this),
            this.particles,
          );
          this.foregroundParticles =
            getLevel().particleContainer.replaceEmitter(
              createWandParticles(this),
              this.foregroundParticles,
            );
        },
        onEnd: () => {
          this.particles = getLevel().backgroundParticles.destroyEmitter(
            this.particles!,
          );
          this.foregroundParticles =
            getLevel().particleContainer.destroyEmitter(
              this.foregroundParticles!,
            );
        },
      })
      .addAnimation(AnimationState.Swing, {
        ...ANIMATION_CONFIG[AnimationState.Swing],
        onEnd: () => {
          const direction =
            this.sprite.scale.x > 0 ? -Math.PI / 3 : Math.PI + Math.PI / 3;
          const [cx, cy] = this.getCenter();
          getServer()?.damage(
            new ImpactDamage(
              Math.floor(cx / 6) + this.sprite.scale.x * 6,
              Math.floor(cy / 6) - 6,
              direction,
              MELEE_POWER *
                (0.7 + getManager().getElementValue(Element.Physical) * 0.3),
            ),
            this.player,
          );

          this.animator.animate(AnimationState.SpellDone);
          getManager().setTurnState(TurnState.Ending);
        },
      })
      .addAnimation(AnimationState.Read, {
        ...ANIMATION_CONFIG[AnimationState.Read],
        onStart: () => {
          if (
            getManager().getActiveCharacter() !== this ||
            !player.controller.isKeyDown(Key.Inventory)
          ) {
            this.animator.setDefaultAnimation(AnimationState.Idle);
            this.animator.animate(AnimationState.Idle);
          }
        },
      })
      .addAnimation(AnimationState.ReadIdle, {
        ...ANIMATION_CONFIG[AnimationState.ReadIdle],
        continuous: () => {
          if (
            (getManager().getActiveCharacter() !== this ||
              !this.player.controller.isKeyDown()) &&
            !this.combat.isCasting()
          ) {
            this.animator.animate(AnimationState.ReadDone);
          }

          return 30;
        },
        onEnd: () => {
          if (
            getManager().getActiveCharacter() !== this ||
            !player.controller.isKeyDown(Key.Inventory)
          ) {
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

    this.namePlate = new BitmapText({
      text: `${this.namePlateName} 100`,
      style: {
        fontFamily: "Eternal",
        fontSize: 32,
      },
    });
    this.namePlate.tint = this.player.color;
    this.namePlate.anchor.set(0.5);
    this.namePlate.position.set(18, -40);

    this.health = new CharacterHealth(this, this.namePlate, this.namePlateName);

    this.addChild(this.sprite, this.namePlate);
  }

  private onCollide = (x: number, y: number) => {
    if (this.body.yVelocity > SMOKE_TRIGGER && this.body.grounded) {
      getLevel().add(new SmokePuff(x * 6 + 18, y * 6 + 72));
    }

    if (
      Math.abs(this.body.xVelocity) > BOUNCE_TRIGGER ||
      Math.abs(this.body.yVelocity) > BOUNCE_TRIGGER
    ) {
      getManager().dealFallDamage(x, y, this);
    }
  };

  getCenter(): [number, number] {
    return [this.position.x + 18, this.position.y + 48];
  }

  tick(dt: number) {
    this._time += dt;
    if (this._time > this.lastActiveTime + Character.maxInactiveTime) {
      this.body.active = 1;
    }

    this.health.reportDamageNumbers();

    if (this.body.active) {
      this.lastActiveTime = this._time;

      getLevel().terrain.characterMask.subtract(
        this.body.mask,
        ...this.body.position,
      );

      if (this.body.tick(dt)) {
        const [x, y] = this.body.precisePosition;
        this.position.set(x * 6, y * 6);

        if (this.body.grounded) {
          this.movement.lastGroundedTime = this._time;
        }

        if (
          getLevel().terrain.killbox.collidesWith(
            this.body.mask,
            this.position.x,
            this.position.y,
          )
        ) {
          getServer()?.damage(
            new GenericDamage(new TargetList().add(this, 999)),
            // this.lastDamageDealer
          );
        }
      }

      getLevel().terrain.characterMask.add(
        this.body.mask,
        ...this.body.position,
      );
    }

    this.animator.tick(dt);

    // Reset climb default when physics unmounts the ladder
    if (
      !this.body.onLadder &&
      this.animator.animationState === AnimationState.ClimbIdle
    ) {
      this.animator.setDefaultAnimation(AnimationState.Idle);
      this.animator.animate(AnimationState.Idle);
    }

    if (
      !this.body.grounded &&
      !this.body.onLadder &&
      Math.abs(this.body.yVelocity) > 2
    ) {
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
    getLevel().terrain.characterMask.subtract(
      this.body.mask,
      ...this.body.position,
    );

    this.body.move(x, y);

    getLevel().terrain.characterMask.add(this.body.mask, ...this.body.position);
  }

  control(controller: Controller) {
    this.movement.control(controller);
  }

  controlContinuous(dt: number, controller: Controller) {
    this.movement.controlContinuous(dt, controller);
  }

  /** Trigger an animation by state name. Used by helpers. */
  animate(state: keyof typeof AnimationState): void {
    this.animator.animate(AnimationState[state]);
  }

  /** Check if current animation is blocking input. Used by CharacterMovement. */
  isAnimationBlocking(): boolean {
    return !!this.animator.isBlocking;
  }

  /** Update look direction from controller mouse position. Used by CharacterMovement. */
  updateLookDirection(controller: Controller): void {
    this.lookDirection = Math.sign(
      controller.getMouse()[0] - this.getCenter()[0],
    );
    this.sprite.scale.x = 2 * this.lookDirection;
  }

  /** Sync animation speed direction with look direction. Used by CharacterMovement. */
  syncAnimationDirection(): void {
    if (this.sprite.animationSpeed * this.lookDirection < 0) {
      this.sprite.animationSpeed *= this.lookDirection;
    }
  }

  /** Check if current animation matches a given state. Used by CharacterCombat. */
  isInAnimationState(state: keyof typeof AnimationState): boolean {
    return this.animator.animationState === AnimationState[state];
  }

  /** Set the default animation state. Used by CharacterCombat. */
  setDefaultAnimation(state: keyof typeof AnimationState): void {
    this.animator.setDefaultAnimation(AnimationState[state]);
  }

  damage(source: DamageSource, damage: number, force?: Force) {
    this.health.damage(source, damage, force);
  }

  setSpellSource(source: any, toggle = true) {
    this.combat.setSpellSource(source, toggle);
  }

  isCasting() {
    return this.combat.isCasting();
  }

  openSpellBook() {
    this.combat.openSpellBook();
  }

  serialize() {
    this.move(...this.body.precisePosition);

    return this.body.serialize();
  }

  deserialize(data: any[]) {
    getLevel().terrain.characterMask.subtract(
      this.body.mask,
      ...this.body.position,
    );

    this.body.deserialize(data);

    getLevel().terrain.characterMask.add(this.body.mask, ...this.body.position);
  }

  serializeCreate() {
    throw new Error("Method not implemented.");
  }

  static create(_: any): Character {
    throw new Error("Method not implemented.");
  }

  die() {
    this.health.die();
  }

  giveWings() {
    this.movement.giveWings();
  }

  removeWings() {
    this.movement.removeWings();
  }

  endTurn() {
    this.movement.endTurn();
  }

  melee() {
    this.combat.melee();
  }

  get hp() {
    return this.health.hp;
  }

  set hp(hp: number) {
    this.health.hp = hp;
  }

  get time() {
    return this._time;
  }

  get direction() {
    return this.lookDirection;
  }

  get lastDamageDealer() {
    return this.health.lastDamageDealer;
  }
}
