<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import { useRouter } from "vue-router";
import {
  subscribeToPublicLobbies,
  sweepStaleLobbies,
  type LobbyEntry,
} from "../../data/network/lobbyAnnouncement";
import { joinByKey } from "../../data/network/joinByKey";

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
  <ul v-if="lobbies.length > 0" class="server-list">
    <li v-for="entry in lobbies" :key="entry.joinKey">
      <button
        class="primary entry"
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
  </ul>
</template>

<style lang="scss" scoped>
.server-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 30px;
  min-width: 320px;
  background: linear-gradient(180deg, var(--parchment-light), var(--parchment-dark));
  border: 2px solid var(--border-accent);
  box-shadow: 0 2px 8px rgba(30, 15, 5, 0.3), inset 0 0 15px rgba(180, 120, 40, 0.08);
  border-radius: 4px;

  .entry {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
    width: 100%;
    text-align: left;
    padding: 8px 16px;
    font-family: Eternal;

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
