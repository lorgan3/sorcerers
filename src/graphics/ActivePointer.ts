import { Sprite } from "pixi.js";
import { AssetsContainer } from "../util/assets/assetsContainer";
import { Level } from "../data/map/level";
import { Spawnable, TickingEntity } from "../data/entity/types";

export class ActivePointer extends Sprite implements TickingEntity {
  private static lifeTime = 140;
  private static fadeTime = 30;
  private static waveDistance = 10;
  private static waveFrequency = 15;
  private time = 0;

  constructor(
    private target: Spawnable,
    private offset: [number, number] = [0, 0]
  ) {
    super(
      AssetsContainer.instance.assets!["atlas"].textures["spells_arrowDown"]
    );

    this.anchor.set(0.5);
    this.scale.set(3);

    Level.instance.add(this);
  }

  tick(dt: number): void {
    this.time += dt;

    let [ox, oy] = this.offset;
    if (this.time > ActivePointer.lifeTime) {
      this.alpha =
        1 - (this.time - ActivePointer.lifeTime) / ActivePointer.fadeTime;
      oy -= (this.time - ActivePointer.lifeTime) * 2;

      if (this.alpha <= 0.01) {
        Level.instance.remove(this);
        return;
      }
    } else {
      oy +=
        Math.sin(this.time / ActivePointer.waveFrequency) *
        ActivePointer.waveDistance;
    }

    const [cx, cy] = this.target.getCenter();
    this.position.set(ox + cx, oy + cy);
  }
}
