import { AccumulatedStat, StatType } from "./accumulatedStat";
import { Stats } from "./stats";

export const getAccumulatedStats = (stats: Stats[]) => {
  const accumulatedStats = Object.fromEntries(
    Object.keys(StatType)
      .filter((type) => !isNaN(Number(type)))
      .map((type) => [
        type,
        AccumulatedStat.accumulate(Number(type) as StatType, stats),
      ])
  );

  const sortedStats = Object.values(accumulatedStats);
  sortedStats.sort((a, b) => b.rank - a.rank);

  return sortedStats;
};
