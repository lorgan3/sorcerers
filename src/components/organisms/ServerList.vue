<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import { useRouter } from "vue-router";
import {
  subscribeToPublicLobbies,
  sweepStaleLobbies,
  type LobbyEntry,
} from "../../data/network/lobbyAnnouncement";
import { joinByKey } from "../../data/network/joinByKey";
import TornPanel from "../atoms/TornPanel.vue";
import PixelDivider from "../atoms/PixelDivider.vue";

const router = useRouter();
const lobbies = ref<LobbyEntry[]>([]);
let unsubscribe: (() => void) | null = null;

onMounted(async () => {
  await sweepStaleLobbies();
  unsubscribe = subscribeToPublicLobbies((entries) => {
    lobbies.value = [...entries].sort((a, b) =>
      a.hostName.localeCompare(b.hostName)
    );
  });
});

onUnmounted(() => {
  unsubscribe?.();
  unsubscribe = null;
});

const handleJoin = async (entry: LobbyEntry) => {
  if (entry.playerCount >= entry.maxPlayers) return;
  try {
    await joinByKey(entry.joinKey, { router });
  } catch (e) {
    console.error("Failed to join lobby", e);
  }
};

const numberFormatter = new Intl.NumberFormat("en");
</script>

<template>
  <TornPanel v-if="lobbies.length > 0" tear="b" class="server-list">
    <h2 class="section-heading">Public games</h2>
    <ul>
      <template v-for="(entry, index) in lobbies" :key="entry.joinKey">
        <li v-if="index > 0" class="separator"><PixelDivider /></li>
        <li>
          <button
            class="entry"
            :disabled="entry.playerCount >= entry.maxPlayers"
            @click="handleJoin(entry)"
          >
            <span class="host">{{ entry.hostName }}</span>
            <span class="map">{{ entry.mapName.replace("_", " ") || "—" }}</span>
            <span class="meta">
              {{ entry.playerCount }}/{{ entry.maxPlayers }} ·
              team {{ entry.gameSettings.teamSize }} ·
              {{ numberFormatter.format(entry.gameSettings.turnLength) }}s turn
            </span>
          </button>
        </li>
      </template>
    </ul>
  </TornPanel>
</template>

<style lang="scss" scoped>
.server-list {
  min-width: 320px;

  ul {
    display: flex;
    flex-direction: column;
    margin-top: 14px;
  }

  .separator {
    padding: 6px 0;
  }

  .entry {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
    width: 100%;
    text-align: left;
    padding: 8px 6px;
    font-family: Eternal;
    background: none;
    border: none;
    cursor: pointer;
    transition: background-color 0.2s ease;

    &:hover:not([disabled]) {
      background-color: rgba(128, 51, 30, 0.08);
    }

    &[disabled] {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .host {
      font-size: 24px;
      letter-spacing: 1px;
    }

    .map {
      font-size: 18px;
      color: var(--highlight);
    }

    .meta {
      font-size: 14px;
      color: var(--primary);
      opacity: 0.8;
      font-family: system-ui;
    }
  }
}
</style>
