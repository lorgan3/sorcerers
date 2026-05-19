import { AnimatedSprite, Sprite } from "pixi.js";
import { AssetsContainer } from "../../util/assets/assetsContainer";
import { BaseItem } from "./baseItem";
import { EntityType } from "./types";
import { Character } from "./character";
import { MessageType } from "../network/types";
import { getLevel, getServer } from "../context";
import { ControllableSound } from "../../sound/controllableSound";
import { Sound } from "../../sound";

const HP_FRACTION = 0.6;
const NUDGE_X = 1.2;
const NUDGE_Y = 1.2;

export function reverseName(name: string): string {
  return [...name].reverse().join("");
}

export class MagicMirror extends BaseItem {
  public readonly type = EntityType.MagicMirror;

  constructor(x: number, y: number, _appeared: boolean) {
    super(x, y, _appeared);

    const atlas = AssetsContainer.instance.assets!["atlas"];

    const sprite = new Sprite(atlas.textures["items_splitPotion"]);
    sprite.anchor.set(0.5, 0.5);
    sprite.position.set(26, 30);
    sprite.scale.set(3);
    this.addChild(sprite);
  }

  serialize() {
    return this.body.serialize();
  }

  deserialize(data: any[]) {
    this.body.deserialize(data);
  }

  serializeCreate(): [number, number, boolean] {
    return [...this.body.precisePosition, this._appeared];
  }

  static create(data: ReturnType<MagicMirror["serializeCreate"]>): MagicMirror {
    return new MagicMirror(...data);
  }

  activate(character?: Character) {
    super.activate(character);

    if (!character) {
      return;
    }

    const originalHp = character.hp;
    const newHp = originalHp * HP_FRACTION;

    // Fall back to +1 so a stationary activator still separates from the mirror.
    const direction = Math.sign(character.body.xVelocity) || 1;

    character.silentSetHp(newHp);
    character.body.addVelocity(direction * NUDGE_X, -NUDGE_Y);

    const [cx, cy] = character.getCenter();
    const appear = new AnimatedSprite(
      AssetsContainer.instance.assets!["atlas"].animations["spells_appear"]
    );
    appear.anchor.set(0.5);
    appear.position.set(cx, cy);
    appear.loop = false;
    appear.scale.set(3);
    appear.animationSpeed = 0.25;
    appear.onComplete = () => getLevel().remove(appear);
    appear.play();
    getLevel().add(appear);
    ControllableSound.fromEntity(this, Sound.Smoke);

    const server = getServer();
    if (server) {
      const [x, y] = character.body.precisePosition;
      const mirroredName = reverseName(character.characterName);
      const mirror = new Character(character.player, x, y, mirroredName);
      character.player.addCharacter(mirror);
      mirror.silentSetHp(newHp);

      const playerIndex = server.players.indexOf(character.player);

      server.broadcast({
        type: MessageType.SpawnCharacter,
        player: playerIndex,
        characterId: mirror.id,
        name: mirroredName,
        hp: newHp,
        x,
        y,
      });
    }

    // The mirror is present on both peers by now: server just pushed it, and
    // SpawnCharacter is broadcast before the Activate that ran this function.
    const mirror =
      character.player.characters[character.player.characters.length - 1];
    if (mirror && mirror !== character) {
      mirror.body.addVelocity(-direction * NUDGE_X, -NUDGE_Y);
    }
  }
}
