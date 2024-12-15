import { Character } from "../../../data/entity/character";
import { AssetsContainer } from "../../../util/assets/assetsContainer";
import { ELEMENT_ATLAS_MAP } from "../../elements";
import { SimpleParticleEmitter } from "../simpleParticleEmitter";

export const createWandParticles = (character: Character) => {
  const elements = character.player.selectedSpell!.elements;

  return new SimpleParticleEmitter(
    elements.map(
      (element) =>
        AssetsContainer.instance.assets!["atlas"].textures[
          `${ELEMENT_ATLAS_MAP[element]}_bright`
        ]
    ),
    {
      ...SimpleParticleEmitter.defaultConfig,
      spawnRange: 0,
      spawnFrequency: 0.3,
      animate: false,
      fade: true,
      xAcceleration: 0.95,
      initialize: () => {
        const direction = Math.random() - 0.5;

        return {
          x:
            character.position.x +
            18 +
            character.direction * 56 +
            direction * 40,
          y: character.position.y + 25 + (Math.random() - 0.5) * 40,
          xVelocity: (Math.sign(-direction) - direction) * 0.5,
          yVelocity: -0.5 - Math.random() * 2,
          frame: Math.floor(Math.random() * elements.length),
          scale: Math.random() * 0.3 + 0.2,
          alpha: Math.random() * 0.2 + 0.8,
        };
      },
    }
  );
};

export const createBackgroundParticles = (character: Character) => {
  const elements = character.player.selectedSpell!.elements;

  return new SimpleParticleEmitter(
    elements.map(
      (element) =>
        AssetsContainer.instance.assets!["atlas"].textures[
          `${ELEMENT_ATLAS_MAP[element]}_bright`
        ]
    ),
    {
      ...SimpleParticleEmitter.defaultConfig,
      spawnRange: 64,
      spawnFrequency: 0.05,
      animate: false,
      fade: true,
      lifeTime: 60,
      initialize: () => {
        const direction = Math.random() - 0.5;

        return {
          x:
            character.position.x +
            18 -
            character.direction * 16 +
            direction * 64,
          y: character.position.y + 48,
          xVelocity: direction,
          yVelocity: -0.2 - Math.random() * 0.5,
          frame: Math.floor(Math.random() * elements.length),
          scale: Math.random() * 0.3 + 0.4,
          alpha: Math.random() * 0.2 + 0.8,
        };
      },
    }
  );
};
