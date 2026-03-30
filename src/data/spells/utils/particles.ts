import { AssetsContainer } from "../../../util/assets/assetsContainer";
import { SimpleParticleEmitter } from "../../../graphics/particles/simpleParticleEmitter";
import { ParticleEmitter } from "../../../graphics/particles/types";
import { getLevel } from "../../context";

type ParticleConfig = ConstructorParameters<typeof SimpleParticleEmitter>[1];

export function createParticles(
  animation: string,
  config: Partial<ParticleConfig> & Pick<ParticleConfig, "initialize">
): ParticleEmitter {
  const atlas = AssetsContainer.instance.assets!["atlas"];
  const emitter = new SimpleParticleEmitter(atlas.animations[animation], {
    ...SimpleParticleEmitter.defaultConfig,
    ...config,
  } as ParticleConfig);
  getLevel().particleContainer.addEmitter(emitter);
  return emitter;
}
