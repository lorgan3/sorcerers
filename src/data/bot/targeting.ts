import { Character } from "../entity/character";
import { getLevel } from "../context";
import { Melee } from "./strategies/melee";
import { StrategyConstructor } from "./strategies/strategy";

export class Targeting {
  private static MAX_TARGETING_RANGE = 2000 * 6;

  private static strategies: StrategyConstructor[] = [Melee];

  static evaluateStrategies(self: Character) {
    const graph = getLevel().buildGraph(self);
    const targets = this.getTargets(self);

    const strategies = this.getPossibleSpells(self)
      .map((Strategy) => {
        const strategy = new Strategy(self);
        strategy.evaluate(graph, targets);

        return strategy;
      })
      .filter(Boolean)
      .sort((a, b) => b!.value - a!.value);

    return strategies;
  }

  static getTargets(self: Character) {
    const characters: Array<[Character, number]> = [];
    getLevel().withNearbyEntities(
      ...self.getCenter(),
      this.MAX_TARGETING_RANGE,
      (entity, distanceSquared) => {
        if (entity instanceof Character && entity.player !== self.player) {
          characters.push([entity, distanceSquared]);
        }
      }
    );

    return characters
      .sort((a, b) => a[1] - b[1])
      .map(([character]) => character);
  }

  private static getPossibleSpells(self: Character) {
    const totalMana = self.player.mana;

    return this.strategies.filter(
      (strategy) =>
        (strategy.spell.costMultiplier?.() || 1) * strategy.spell.cost <=
        totalMana
    );
  }
}
