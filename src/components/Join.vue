<script setup lang="ts">
import { onMounted, ref } from "vue";
import { get, set } from "../util/localStorage";
import { defaults } from "../util/localStorage/settings";
import Peer from "peerjs";
import { Client } from "../data/network/client";
import { PEER_ID_PREFIX } from "../data/network";
import { MessageType } from "../data/network/types";
import { Team } from "../data/team";

const { onBack, onPlay } = defineProps<{
  onBack: () => void;
  onPlay: () => void;
}>();

const settings = get("Settings") || defaults();

const teams = ref(settings.teams);
const selectedTeam = ref(settings.defaultTeam);
const name = ref(settings.name);

const key = ref("");
const players = ref<string[]>([]);
const map = ref("");

const createClient = () => {
  const peer = new Peer();

  peer.on("error", () => {
    peer.destroy();

    createClient();
  });

  peer.once("open", () => {
    peer.off("error");
    new Client(peer);
  });
};

const handleConnect = () => {
  set("Settings", {
    ...settings,
    name: name.value,
    defaultTeam: selectedTeam.value,
  });

  if (!Client.instance) {
    return;
  }

  Client.instance.join(
    PEER_ID_PREFIX + key.value,
    name.value.trim() || "Player",
    teams.value[selectedTeam.value] || Team.random()
  );

  Client.instance.onLobbyUpdate((message) => {
    switch (message.type) {
      case MessageType.LobbyUpdate:
        players.value = message.players;
        map.value = message.map;
        break;

      case MessageType.StartGame:
        onPlay();
        break;
    }
  });
};

onMounted(() => {
  createClient();
});

const handleBack = () => {
  if (Client.instance) {
    Client.instance.peer.destroy();
  }

  onBack();
};
</script>

<template>
  <div class="background">
    <h1>Join</h1>
    <div class="client">
      <div v-if="players.length" class="code flex-list">
        <h3>
          Room code: <span class="key">{{ key }}</span>
        </h3>

        <div class="flex-list">
          <h3>Players</h3>
          <ul class="players">
            <li v-for="player in players">{{ player }}</li>
          </ul>
        </div>

        <div>
          <h3>Map</h3>
          {{ map }}
        </div>
      </div>

      <div v-else class="options flex-list">
        <h3>Settings</h3>
        <label>
          Room key
          <input v-model="key" autofocus />
        </label>

        <label>
          Name
          <input v-model="name" />
        </label>

        <label>
          Team
          <select v-model="selectedTeam">
            <option v-for="(team, index) in teams" :value="index">
              {{ team.name }}
            </option>
          </select>
          <span class="meta"
            >({{ teams[selectedTeam]?.characters.join(", ") }})</span
          >
        </label>
      </div>
    </div>

    <div class="buttons">
      <button v-if="!players.length" @click="handleConnect" class="primary">
        Connect
      </button>
      <button @click="handleBack" class="secondary">Back</button>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.background {
  height: 100%;
  background: #b5a78a;

  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 30px;
}

.client {
  display: flex;
  flex-direction: column;
  gap: 20px;

  h3 {
    font-size: 28px;
    letter-spacing: 1.2px;
  }
}

.code {
  .players {
    padding: 25px;
    background: #9c917b;
    box-shadow: 0 0 10px inset #433e34;
    border-radius: 5px;
  }
}

.options {
  label {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  select,
  input {
    font-size: 24px;
    font-family: "Eternal";
    width: 300px;
    padding: 3px;
    box-sizing: border-box;
  }

  .meta {
    color: #433e34;
    font-size: 20px;
  }
}

.buttons {
  display: flex;
  gap: 10px;
}
</style>
