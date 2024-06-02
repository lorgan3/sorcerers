import {
  Container,
  FillGradient,
  Graphics,
  Texture,
  TilingSprite,
} from "pixi.js";
import { AssetsContainer } from "../../util/assets/assetsContainer";
import { Viewport } from "./viewport";
import { map } from "../../util/math";

export interface ParallaxConfig {
  atlas: string;
  color: string;
  gradient: Array<[string, number]>;
  layers: Array<{
    texture: string;
    speed: number; // basically the distance, 1 = same distance as the character, 0 = infinitely far (static), > 1 = closer than the character
    xOffset?: number;
    yOffset?: number;
  }>;
}

export const CONFIGS: Record<string, ParallaxConfig> = {
  Ocean: {
    atlas: "backgrounds",
    color: "#8fb8ea",
    gradient: [
      ["#8fb8ea", 0],
      ["#8fb8ea", 0.9],
      ["#5e7eb5", 0.9],
    ],
    layers: [
      { texture: "ocean_clouds3", speed: 0.1, yOffset: -120 },
      { texture: "ocean_clouds2", speed: 0.2, yOffset: -60 },
      { texture: "ocean_clouds1", speed: 0.3 },
      { texture: "ocean_water", speed: 1, yOffset: 180 },
    ],
  },
};

export class Background extends Container {
  private config: ParallaxConfig;

  constructor(
    private viewport: Viewport,
    private offsetX = 0,
    private offsetY = 0,
    key: keyof typeof CONFIGS = "Ocean"
  ) {
    super();

    this.config = CONFIGS[key];
    const height = this.viewport.worldHeight / 6;
    const width = this.viewport.worldWidth / 6;

    const gradient = new FillGradient(0, 0, 1, height);
    this.config.gradient.forEach(([color, step]) =>
      gradient.addColorStop(step, color)
    );
    const background = new Graphics().rect(0, 0, width, height).fill(gradient);
    background.scale.set(6);

    const atlas = AssetsContainer.instance.assets![this.config.atlas];

    this.addChild(
      background,
      ...this.config.layers.map((layer) => {
        const texture = atlas.textures[layer.texture] as Texture;
        const sprite = new TilingSprite({
          texture: atlas.textures[layer.texture],
          width: viewport.worldWidth,
          height: texture.height,
        });

        sprite.scale.set(6);

        return sprite;
      })
    );
  }

  update() {
    const center = this.viewport.center;
    const x = this.viewport.worldWidth / 2;
    const y = this.viewport.worldHeight / 2;

    const dx = x - this.viewport.screenWidth / 2;
    const dy = y - this.viewport.screenHeight / 2;

    for (let i = 0; i < this.config.layers.length; i++) {
      const layer = this.config.layers[i];
      const child = this.children[i + 1];
      const yOffset =
        (layer.yOffset || 0) / map(this.viewport.scale.x, 1, layer.speed);

      child.position.set(
        (center[0] - x) * (1 - layer.speed) +
          this.offsetX * layer.speed +
          dx +
          (layer.xOffset || 0) -
          child.width / 2,
        (center[1] - y) * (1 - layer.speed) +
          this.offsetY * layer.speed +
          dy +
          yOffset -
          child.height / 2
      );
    }
  }
}
