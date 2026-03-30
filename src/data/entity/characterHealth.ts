import { BitmapText } from "pixi.js";
import { Player } from "../network/player";
import { DamageSource } from "../damage/types";
import { Force } from "../damage/targetList";
import { ControllableSound } from "../../sound/controllableSound";
import { Sound } from "../../sound";
import { getLevel, getServer } from "../context";
import { ExplosiveDamage } from "../damage/explosiveDamage";
import { AssetsContainer } from "../../util/assets/assetsContainer";
import { Texture } from "pixi.js";
import { Explosion } from "../../graphics/explosion";
import { createCharacterGibs } from "./gib/characterGibs";
import type { Character } from "./character";

export class CharacterHealth {
  private static readonly invulnerableTime = 1;
  private static readonly damageNumberTime = 90;
  private static readonly damageAttributionTime = 120;

  private _hp = 100;
  private lastReportedHp = this._hp;
  private lastDamageTime = -1;
  private _lastDamageDealer: Player | null = null;

  constructor(
    private character: Character,
    private namePlate: BitmapText,
    private namePlateName: string
  ) {}

  get hp(): number {
    return this._hp;
  }

  set hp(hp: number) {
    const oldHp = this._hp;
    const diff = hp - oldHp;
    if (diff > 0) {
      getLevel().numberContainer.heal(diff, ...this.character.getCenter());
      this.lastReportedHp += diff;
      this.namePlate.text = `${this.namePlateName} ${Math.max(
        0,
        Math.ceil(this.lastReportedHp)
      )}`;
    }

    this._hp = hp;
    this.character.body.active = 1;
  }

  get lastDamageDealer(): Player | null {
    if (
      this.character.time >
      this.lastDamageTime + CharacterHealth.damageAttributionTime
    ) {
      return null;
    }

    return this._lastDamageDealer;
  }

  reportDamageNumbers(): void {
    if (
      this.lastReportedHp !== this._hp &&
      this.character.time >
        this.lastDamageTime + CharacterHealth.damageNumberTime
    ) {
      getLevel().numberContainer.damage(
        this.lastReportedHp - this._hp,
        ...this.character.getCenter()
      );
      this.namePlate.text = `${this.namePlateName} ${Math.max(
        0,
        Math.ceil(this._hp)
      )}`;
      this.lastReportedHp = this._hp;
    }
  }

  damage(source: DamageSource, damage: number, force?: Force): void {
    if (
      this.lastDamageTime !== -1 &&
      this.character.time <=
        this.lastDamageTime + CharacterHealth.invulnerableTime
    ) {
      return;
    }

    this.character.player.stats.registerDamage(
      source,
      this.character,
      damage,
      force
    );

    this.hp -= damage;
    this.lastDamageTime = this.character.time;
    this._lastDamageDealer = source.cause;
    this.character.body.unmountLadder();

    getLevel().bloodEmitter.burst(this.character, damage, source);
    if (damage > 0) {
      ControllableSound.fromEntity(this.character, Sound.Splat);
    }

    if (force) {
      this.character.body.addAngularVelocity(force.power, force.direction);
    }
  }

  die(): void {
    if (this._hp !== this.lastReportedHp) {
      getLevel().numberContainer.damage(
        this.lastReportedHp - this._hp,
        ...this.character.getCenter()
      );
      this.namePlate.text = `${this.namePlateName} ${Math.max(
        0,
        Math.ceil(this._hp)
      )}`;
      this.lastReportedHp = this._hp;
    }

    getLevel().terrain.characterMask.subtract(
      this.character.body.mask,
      ...this.character.body.position
    );

    this.character.player.removeCharacter(this.character);

    const [x, y] = this.character.getCenter();
    new Explosion(x, y);
    getLevel().shake();

    const gibs = createCharacterGibs(
      ...this.character.body.precisePosition
    );
    gibs.forEach((gib) =>
      gib.body.addVelocity(
        (Math.random() - 0.5) * 8,
        -2 - Math.random() * 3
      )
    );
    getLevel().add(...gibs);
    getLevel().bloodEmitter.burst(this.character, 100);

    getLevel().terrain.draw((ctx) => {
      const splat = AssetsContainer.instance.assets!["atlas"].textures[
        "gibs_splat"
      ] as Texture;

      ctx.drawImage(
        splat.source.resource,
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

    getServer()?.damage(
      new ExplosiveDamage(x / 6, y / 6, 16, 1, 1),
      this.character.player
    );
  }
}
