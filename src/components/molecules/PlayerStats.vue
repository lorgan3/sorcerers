<script setup lang="ts">
import { computed } from "vue";
import { Element } from "../../data/spells/types";
import { COLORS } from "../../data/network/constants";
import { ELEMENT_MAP, ELEMENT_COLOR_MAP } from "../../graphics/elements";
import { IPlayer, Rank } from "../types";

const RANK_MAP: Record<Rank, { text: string; color: string; delay: string }> = {
  [Rank.Gold]: {
    text: "1st place",
    color: "#ffcf40",
    delay: "0s",
  },
  [Rank.Silver]: {
    text: "2nd place",
    color: "#C0C0C0",
    delay: "1s",
  },
  [Rank.Bronze]: {
    text: "3rd place",
    color: "#cd7f32",
    delay: "2s",
  },
  [Rank.None]: {
    text: "Last place",
    color: "var(--background)",
    delay: "3s",
  },
};

const { player, spellEfficiency, spellUsage, rank } = defineProps<{
  player: IPlayer;
  spellEfficiency: Record<Element, number>;
  spellUsage: Record<Element, number>;
  rank: Rank;
}>();

const offset = COLORS.length - COLORS.indexOf(player.color) - 1;

const favoriteElement = computed(
  () => Object.entries(spellUsage).sort((a, b) => b[1] - a[1])[0][0] as Element
);

const grade = computed(() => {
  const percent =
    Object.values(spellEfficiency).reduce((sum, value) => sum + value, 0) / 4;

  if (percent < 0.45) {
    return "F";
  }

  if (percent < 0.5) {
    return "E";
  }

  if (percent < 0.55) {
    return "D";
  }

  if (percent < 0.6) {
    return "C";
  }

  if (percent < 0.65) {
    return "B";
  }

  if (percent < 0.7) {
    return "A";
  }

  if (percent < 0.85) {
    return "S";
  }

  return "SS";
});
</script>

<template>
  <div
    class="player-stats"
    :style="{
      '--team-offset': offset,
      '--color': RANK_MAP[rank].color,
      '--delay': RANK_MAP[rank].delay,
    }"
  >
    <h1 class="rank">
      {{ RANK_MAP[rank].text }}
    </h1>
    <h2 class="player-name" :style="{ '--color': player.color }">
      {{ player.name }}
    </h2>

    <div class="favorite">
      <h3>Favorite element</h3>
      <span class="element"
        ><img
          :src="ELEMENT_MAP[favoriteElement]"
          :alt="favoriteElement"
          :title="favoriteElement"
      /></span>
    </div>
    <div class="efficiency">
      <h3>Efficiency</h3>
      <div class="efficiency-content">
        <div class="element-bars">
          <div
            v-for="element in Element"
            class="element"
            :style="{
              '--efficiency': spellEfficiency[element],
              '--color': ELEMENT_COLOR_MAP[element],
            }"
          ></div>
        </div>
        <h2 class="grade">{{ grade }}</h2>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.player-stats {
  position: relative;
  width: 180px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 3px;
  border-left: 10px solid var(--color);
  opacity: 0;
  animation: appear 0.5s var(--delay, 0s) forwards;

  .rank {
    color: var(--color, var(--primary));
    text-shadow: 1px 1px var(--primary);
  }

  .player-name {
    text-shadow: 2px 2px 2px var(--color);
    flex: 1;
    text-overflow: ellipsis;
    overflow: hidden;
    z-index: 1;
  }

  .favorite {
    display: flex;
    align-items: end;
    gap: 6px;

    h3 {
      flex: 4;
    }

    .element {
      flex: 1;
      justify-content: center;
      display: flex;

      img {
        animation: pulse 3s infinite;
        filter: brightness(calc(var(--pulse, 1))) drop-shadow(2px 2px 0px #000);
      }
    }
  }

  .efficiency {
    z-index: 1;

    .efficiency-content {
      flex: 1;
      display: flex;
      gap: 6px;

      .element-bars {
        display: flex;
        flex-direction: column;
        gap: 3px;
        flex: 4;

        .element {
          height: 6px;
          width: 100%;
          border-radius: 4px;
          position: relative;
          width: 100%;
          background-color: var(--background);

          &::before {
            content: "";
            display: block;
            height: 6px;
            width: calc(var(--efficiency, 0) * 100%);
            min-width: 5%;
            animation: pulse 3s infinite;
            animation-delay: calc(var(--efficiency, 0) * 1s);
            filter: brightness(var(--pulse, 1));
            background-color: var(--color, "#000");
            box-shadow: 2px 2px 2px rgba(0, 0, 0, 0.4);
            border-radius: 4px;
            translate: 0 -1px;
          }
        }
      }

      .grade {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
      }
    }
  }
}
</style>
