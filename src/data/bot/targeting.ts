import { Character } from "../entity/character";
import { getLevel } from "../context";
import { Melee } from "./strategies/melee";
import { Bakuretsu } from "./strategies/bakuretsu";
import { Fireball } from "./strategies/fireball";
import { Zoltraak } from "./strategies/zoltraak";
import { Nephtear } from "./strategies/nephtear";
import { MagicMissile } from "./strategies/magicMissile";
import { StrategyConstructor } from "./strategies/strategy";

export class Targeting {
  private static MAX_TARGETING_RANGE = 2000 * 6;

  // Order doesn't matter — Targeting.evaluateStrategies sorts by computed value.
  private static strategies: StrategyConstructor[] = [
    Melee,
    Bakuretsu,
    Fireball,
    Zoltraak,
    Nephtear,
    MagicMissile,
  ];

  static evaluateStrategies(self: Character) {
    const graph = getLevel().buildGraph(self);
    const targets = this.getTargets(self);

    const strategies = this.getPossibleSpells(self)
      .map((Strategy) => {
        const strategy = new Strategy(self);
        strategy.evaluate(graph, targets);

        return strategy;
      })
      .filter((strategy) => strategy.hasEvaluation())
      .sort((a, b) => b.value - a.value);

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
