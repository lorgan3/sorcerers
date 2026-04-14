import { Container, Sprite } from "pixi.js";
import { Character } from "../entity/character";
import { EntityType, Spawnable } from "../entity/types";
import { TurnState } from "../network/types";
import { getLevel, getManager, getServer } from "../context";
import { AcidDroplet } from "./acidDroplet";
import { ControllableSound } from "../../sound/controllableSound";
import { Sound } from "../../sound";
import { AssetsContainer } from "../../util/assets/assetsContainer";

export class AcidSpray extends Container implements Spawnable {
  private static startDelay = 30; // ~300ms for wand animation
  private static duration = 130; // startDelay + 100 ticks (~1s) of spraying
  private static spawnInterval = 10;
  private static particleSpeed = 11;
  private static dropletSpeed = 1.8;
  private static particleSpread = Math.PI / 16;
  private static dropletSpread = Math.PI / 32;

  public id = -1;
  public readonly type = EntityType.AcidSpray;

  private direction: number;
  private time = 0;
  private spawnCounter = 0;
  private sound: ControllableSound | undefined;
  private pointer: Sprite;

  constructor(
    private character: Character,
    direction: number
  ) {
    super();
    this.direction = direction;
    character.setSpellSource(this);

    const atlas = AssetsContainer.instance.assets!["atlas"];
    this.pointer = new Sprite(atlas.textures["spells_pointer"]);
    this.pointer.anchor.set(0.4, 0.25);
    this.pointer.scale.set(2);
    this.pointer.tint = this.character.player.color;
    getLevel().uiContainer.addChild(this.pointer);
  }

  getCenter(): [number, number] {
    return this.character.getCenter();
  }

  private getStaffTip(): [number, number] {
    return [
      (this.character.position.x + 18 + this.character.direction * 56) / 6,
      (this.character.position.y + 25) / 6,
    ];
  }

  tick(dt: number) {
    this.time += dt;
    this.sound?.update(this.character);

    // Update direction from controller (like MagicMissile)
    const [cx, cy] = this.character.getCenter();
    const [mx, my] = this.character.player.controller.getMouse();
    this.direction = Math.atan2(my - cy, mx - cx);

    // Update pointer position
    const localMouse = this.character.player.controller.getLocalMouse();
    this.pointer.position.set(...localMouse);
    this.pointer.scale.set(2 / getLevel().viewport.scale.x);

    if (this.time < AcidSpray.startDelay) {
      return;
    }

    if (!this.sound) {
      this.sound = ControllableSound.fromEntity(
        this.character,
        Sound.DarkMagic,
        { loop: true }
      );
    }

    const sprayTime = this.time - AcidSpray.startDelay;
    const [staffX, staffY] = this.getStaffTip();
    const pixelX = staffX * 6;
    const pixelY = staffY * 6;

    const particleCount = 1 + Math.floor(Math.random() * 3);
    for (let i = 0; i < particleCount; i++) {
      const angle =
        this.direction + (Math.random() - 0.5) * 2 * AcidSpray.particleSpread;
      const speed =
        AcidSpray.particleSpeed * (0.8 + Math.random() * 0.4);
      getLevel().bloodEmitter.spawn(
        pixelX,
        pixelY,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        "#3fba24"
      );
    }

    if (this.spawnCounter < Math.floor(sprayTime / AcidSpray.spawnInterval)) {
      this.spawnCounter++;
      const angle =
        this.direction + (Math.random() - 0.5) * 2 * AcidSpray.dropletSpread;
      const droplet = new AcidDroplet(
        staffX,
        staffY,
        AcidSpray.dropletSpeed,
        angle,
        getLevel().terrain.characterMask
      );
      getLevel().add(droplet);
    }

    if (getServer() && this.time >= AcidSpray.duration) {
      getServer()!.kill(this);
    }
  }

  die() {
    this.sound?.destroy();
    getLevel().uiContainer.removeChild(this.pointer);
    this.character.setSpellSource(this, false);
    getLevel().remove(this);
    getManager().setTurnState(TurnState.Ending);
  }

  serializeCreate() {
    return [this.character.id, this.direction] as const;
  }

  static create(data: ReturnType<AcidSpray["serializeCreate"]>) {
    return new AcidSpray(
      getLevel().entityMap.get(data[0]) as Character,
      data[1]
    );
  }

  static cast(character: Character, direction: number) {
    const server = getServer();
    if (!server) {
      return;
    }

    const entity = new AcidSpray(character, direction);
    server.create(entity);
    return entity;
  }
}
