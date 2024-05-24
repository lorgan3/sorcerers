<script setup lang="ts">
import { onMounted, ref } from "vue";
import { get, set } from "../util/localStorage";
import { defaults } from "../util/localStorage/settings";
import Peer from "peerjs";
import { Client } from "../data/network/client";
import { PEER_ID_PREFIX } from "../data/network/constants";
import { MessageType } from "../data/network/types";
import { Team } from "../data/team";
import { Map } from "../data/map";
import Input from "./Input.vue";
import { Manager } from "../data/network/manager";

const LAST_GAME_KEY = "lastGameKey";

const { onBack, onPlay } = defineProps<{
  onBack: () => void;
  onPlay: (map: Map) => void;
}>();

const settings = get("Settings") || defaults();

const teams = ref(settings.teams);
const selectedTeam = ref(settings.defaultTeam ?? 0);
if (!teams.value[selectedTeam.value]) {
  selectedTeam.value = 0;
}

const name = ref(settings.name);
const connecting = ref(false);
const clientReady = ref(false);

const key = ref(sessionStorage.getItem(LAST_GAME_KEY) || "");
const players = ref<string[]>([]);
const map = ref("");

const nameValidator = (name: string) => !!name.trim();

const createClient = () => {
  Manager.instance?.destroy();

  clientReady.value = false;
  const peer = new Peer();

  peer.on("error", () => {
    connecting.value = false;

    createClient();
  });

  peer.once("open", () => {
    peer.off("error");
    new Client(peer);
    clientReady.value = true;
  });
};

const handleConnect = async () => {
  if (connecting.value || !Client.instance) {
    return;
  }

  connecting.value = true;
  set("Settings", {
    ...settings,
    name: name.value,
    defaultTeam: selectedTeam.value,
  });

  try {
    await Client.instance.join(
      PEER_ID_PREFIX + key.value,
      name.value.trim() || "Player",
      teams.value[selectedTeam.value] || Team.random()
    );

    sessionStorage.setItem(LAST_GAME_KEY, key.value);
  } catch {
    connecting.value = false;
    return;
  }

  Client.instance.onLobbyUpdate(
    async (message) => {
      switch (message.type) {
        case MessageType.LobbyUpdate:
          players.value = message.players;
          map.value = message.map;
          break;

        case MessageType.StartGame:
          onPlay(
            await Map.fromConfig({
              terrain: {
                data: new Blob([message.map.terrain.data]),
                mask: message.map.terrain.mask,
              },
              background: {
                data: new Blob([message.map.background.data]),
              },
              layers: message.map.layers.map((layer) => ({
                ...layer,
                data: new Blob([layer.data]),
              })),
              bbox: message.map.bbox,
            })
          );
          break;
      }
    },
    () => {
      console.log("disconnect");
      createClient();
      connecting.value = false;
      players.value = [];
    }
  );
};

onMounted(() => createClient());

const handleBack = () => {
  if (Client.instance) {
    Client.instance.destroy();
  }

  onBack();
};
</script>

<template>
  <div class="client">
    <template v-if="connecting">
      <div class="code flex-list">
        <h2>
          Room code: <span class="key">{{ key }}</span>
        </h2>
      </div>

      <div class="flex-list flex-list--wide">
        <h2>Players</h2>
        <ul class="players">
          <li v-for="player in players">{{ player }}</li>
          <li v-if="!players.length">Connecting...</li>
        </ul>
      </div>

      <div>
        <h2>Map</h2>
        {{ map }}
      </div>
    </template>

    <div v-else class="options flex-list">
      <h2>Settings</h2>
      <Input label="Room key" v-model="key" autofocus />
      <Input label="Name" v-model="name" :validator="nameValidator" />

      <label class="label">
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
    <button
      v-if="!players.length"
      @click="handleConnect"
      class="primary"
      :disabled="!key || !nameValidator(name) || !clientReady"
    >
      Connect
    </button>
    <button @click="handleBack" class="secondary">
      {{ players.length ? "Disconnect" : "Back" }}
    </button>
  </div>
</template>

<style lang="scss" scoped>
.client {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.players {
  padding: 25px;
  background: var(--background);
  box-shadow: 0 0 10px inset var(--primary);
  border-radius: var(--small-radius);
}

.options {
  label {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  select {
    background: var(--background);
    box-shadow: 0 0 10px inset var(--primary);
    height: 35px;
    border-radius: var(--small-radius);
    outline: none;
  }

  .label {
    font-family: Eternal;
    font-size: 24px;
    color: var(--primary);
  }

  .meta {
    color: #433e34;
    font-size: 14px;
    font-family: system-ui;
  }
}

.buttons {
  display: flex;
  gap: 10px;
}
</style>
