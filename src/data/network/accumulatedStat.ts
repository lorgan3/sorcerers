import { Element } from "../spells/types";
import { Player } from "./player";
import { Stats } from "./stats";

export enum StatType {
  Score,
  ElementUsage,
  ElementEfficiency,
  SelfDamage,
  OverkillDamage,
  DamageDealt,
  KnockbackDealt,
  DamageTaken,
  KnockbackTaken,
  Deaths,
  Kills,
  PotionsUsed,
  ScrollsUsed,
}

export interface Value<T> {
  player: Player;
  value: T;
}

export class AccumulatedStat<T> {
  private _rank?: number;

  constructor(
    public readonly type: StatType,
    public readonly values: Value<T>[]
  ) {}

  get rank() {
    if (this._rank !== undefined) {
      return this._rank;
    }

    if (
      this.type === StatType.Score ||
      this.type === StatType.ElementEfficiency ||
      this.type === StatType.ElementUsage
    ) {
      this._rank = -1;
      return this._rank;
    }

    const high = this.values[0].value as number;
    const low = this.values[this.values.length - 1].value as number;

    if (high === 0 && low === 0) {
      this._rank = 0;
      return this._rank;
    }

    const lameStat = high === 0 || low === 0;
    this._rank =
      (Math.abs(high - low) / (high + low)) *
      (1 + Math.random() * 0.3 - 0.15) *
      (lameStat ? 0.6 : 1);
    return this._rank;
  }

  get name() {
    return this.values[0].player.name;
  }

  get result() {
    return this.values[0].value;
  }

  get text() {
    return ACCUMULATORS[this.type].translate(this);
  }

  serialize() {
    return [
      this.type,
      this.values.map((value) => [value.player.color, value.value]),
    ];
  }

  static deserialize(data: any[], players: Record<string, Player>) {
    return new AccumulatedStat(
      data[0],
      data[1].map((value: any[]) => ({
        player: players[value[0]],
        value: value[1],
      }))
    );
  }

  static accumulate<T extends StatType>(type: T, stats: Stats[]) {
    return new AccumulatedStat<
      ReturnType<(typeof ACCUMULATORS)[T]["accumulate"]>
    >(type, ACCUMULATORS[type].accumulate(stats) as any);
  }
}

const sortedNumber =
  (type: StatType, key: keyof Stats, direction: 1 | -1) => (stats: Stats[]) => {
    const values = stats.map(
      (stat) => ({ player: stat.self, value: stat[key] } as Value<number>)
    );

    values.sort((a, b) => (b.value - a.value) * direction);
    return values;
  };

const highestNumber = (type: StatType, key: keyof Stats) =>
  sortedNumber(type, key, 1);
const lowestNumber = (type: StatType, key: keyof Stats) =>
  sortedNumber(type, key, -1);

interface Accumulator<T> {
  accumulate: (stats: Stats[]) => Value<T>[];
  translate: (stat: AccumulatedStat<T>) => string;
}

const ACCUMULATORS = {
  [StatType.Score]: {
    accumulate: highestNumber(StatType.Score, "timeOfDeath"),
    translate: (stat) => `${stat.name} had the highest score!`,
  },
  [StatType.SelfDamage]: {
    accumulate: highestNumber(StatType.SelfDamage, "selfDamage"),
    translate: (stat) => `${stat.name} did the most damage... to themselves.`,
  },
  [StatType.OverkillDamage]: {
    accumulate: highestNumber(StatType.OverkillDamage, "overkillDamage"),
    translate: (stat) => `${stat.name} please stop, they're already dead!`,
  },
  [StatType.DamageDealt]: {
    accumulate: highestNumber(StatType.DamageDealt, "damageDealt"),
    translate: (stat) =>
      `${stat.name} came prepared and dealt the most damage.`,
  },
  [StatType.KnockbackDealt]: {
    accumulate: highestNumber(StatType.KnockbackDealt, "knockbackDealt"),
    translate: (stat) => `${stat.name} dealt the most knockback.`,
  },
  [StatType.DamageTaken]: {
    accumulate: highestNumber(StatType.DamageTaken, "damageTaken"),
    translate: (stat) => `${stat.name} played tank and took the most damage.`,
  },
  [StatType.KnockbackTaken]: {
    accumulate: highestNumber(StatType.KnockbackTaken, "knockbackTaken"),
    translate: (stat) =>
      `${stat.name} was a punching bag, getting knocked around the most.`,
  },
  [StatType.Deaths]: {
    accumulate: lowestNumber(StatType.Deaths, "deaths"),
    translate: (stat) =>
      `${stat.name} takes good care of their sorcerers and lost the least.`,
  },
  [StatType.Kills]: {
    accumulate: (stats: Stats[]) => {
      const values = stats.map(
        (stat) =>
          ({ player: stat.self, value: stat.kills.length } as Value<number>)
      );

      values.sort((a, b) => b.value - a.value);
      return values;
    },
    translate: (stat) =>
      `${stat.name} was bloodthirsty killing the most sorcerers.`,
  },
  [StatType.ElementUsage]: {
    accumulate: (stats: Stats[]) =>
      stats.map((stat) => {
        const total =
          Object.values(stat.elementUsage).reduce(
            (sum, value) => sum + value,
            0
          ) || 1;

        return {
          player: stat.self,
          value: Object.fromEntries(
            Object.values(Element).map((element) => [
              element,
              stat.elementUsage[element] / total,
            ])
          ),
        };
      }),
    translate: () => "",
  },
  [StatType.ElementEfficiency]: {
    accumulate: (stats: Stats[]) => {
      const values = stats.map((stat) => {
        const value = {
          player: stat.self,
          value: Object.fromEntries(
            Object.values(Element).map((element) => [
              element,
              stat.elementUsage[element]
                ? stat.elementEfficiency[element] /
                  stat.elementUsage[element] /
                  1.75
                : 0.57,
            ])
          ),
          avg: 0,
        };
        value.avg =
          Object.values(value.value).reduce((sum, value) => sum + value, 0) / 4;

        return value;
      });

      values.sort((a, b) => a.avg - b.avg);
      return values;
    },
    translate: () => "",
  },
  [StatType.PotionsUsed]: {
    accumulate: highestNumber(StatType.PotionsUsed, "potionsUsed"),
    translate: (stat) =>
      `${stat.name} was addicted to potions and drank the most.`,
  },
  [StatType.ScrollsUsed]: {
    accumulate: highestNumber(StatType.ScrollsUsed, "scrollsUsed"),
    translate: (stat) => `${stat.name} is a scholar and read the most scrolls.`,
  },
} satisfies Record<StatType, Accumulator<any>>;
