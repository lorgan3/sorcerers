<script setup lang="ts">
import { Manager } from "../../data/network/manager";
import Dialog from "../molecules/Dialog.vue";
import { AccumulatedStat, StatType } from "../../data/network/accumulatedStat";
import { computed, onMounted } from "vue";
import { Element } from "../../data/spells/types";
import PlayerStats from "../molecules/PlayerStats.vue";
import { Rank } from "../types";
import { Sound, getRandomSound } from "../../sound";
import { sound } from "@pixi/sound";

const { stats } = defineProps<{
  stats: AccumulatedStat<any>[];
}>();

const playerStats = computed(() => {
  const score = stats.find((stat) => stat.type === StatType.Score)!;
  const efficiency = stats.find(
    (stat) => stat.type === StatType.ElementEfficiency
  )!;
  const usage = stats.find((stat) => stat.type === StatType.ElementUsage)!;

  return score.values.map(({ player, value }) => ({
    player,
    efficiency: efficiency.values.find((values) => values.player === player)!
      .value as Record<Element, number>,
    usage: usage.values.find((values) => values.player === player)!
      .value as Record<Element, number>,
  }));
});

const rankArray = Object.values(Rank);

const handleQuit = () => {
  Manager.instance.destroy();
};

onMounted(() => {
  const soundData = getRandomSound(Sound.Tada);
  sound.play(soundData.key, {
    volume: soundData.volume,
  });
});
</script>

<template>
  <Dialog title="Game over!" :onClose="handleQuit" open ingame>
    <section class="players">
      <PlayerStats
        v-for="({ player, efficiency, usage }, i) in playerStats"
        :player="player"
        :spellEfficiency="efficiency"
        :spellUsage="usage"
        :rank="rankArray[i] || Rank.None"
      />
    </section>

    <section class="highlights">
      <div
        class="highlight"
        :style="{ '--delay': `${Math.min(4, playerStats.length) + i}s` }"
        v-for="i in 3"
      >
        {{ stats[i - 1].text }}
      </div>
    </section>

    <span class="dialog-buttons">
      <button class="primary" @click="handleQuit" autofocus>Main menu</button>
    </span>
  </Dialog>
</template>

<style lang="scss" scoped>
.players {
  display: flex;
  gap: 10px;
}

.highlights {
  margin: 10px 0;
  min-width: 600px;

  .highlight {
    animation: appear 0.5s var(--delay, 0s) forwards;
    opacity: 0;
  }
}

.dialog-buttons {
  margin-top: 8px;
  display: flex;
  gap: 8px;
  justify-content: center;
  padding: 2px;

  button {
    pointer-events: all;
    cursor: url("../../assets/pointer.png"), auto;
  }
}
</style>
