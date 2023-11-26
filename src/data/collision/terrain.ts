import { Container, Sprite, Texture } from "pixi.js";
import { CollisionMask } from "./collisionMask";

export class Terrain extends Container {
  private foreground: Texture;

  constructor(
    public readonly collisionMask: CollisionMask,
    private background: Texture,
    foreground?: Texture
  ) {
    super();
    this.scale.set(6);

    if (!foreground) {
      const canvas = document.createElement("canvas");
      canvas.width = background.width;
      canvas.height = background.height;

      this.foreground = Texture.from(canvas);
    } else {
      this.foreground = foreground;
    }

    this.addChild(new Sprite(this.background), new Sprite(this.foreground));
  }
}
