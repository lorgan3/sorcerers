<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import { get, set } from "../util/localStorage";
import { defaults } from "../util/localStorage/settings";
import { Server } from "../data/network/server";
import { PEER_ID_PREFIX } from "../data/network";
import { MessageType } from "../data/network/types";
import Peer from "peerjs";
import { defaultMaps } from "../util/assets/index";
import { Team } from "../data/team";
import { Map } from "../data/map";
import { AssetsContainer } from "../util/assets/assetsContainer";
import Input from "./Input.vue";

const { onBack, onPlay } = defineProps<{
  onBack: () => void;
  onPlay: (map: Map) => void;
}>();

const settings = get("Settings") || defaults();

const teams = ref(settings.teams);
const selectedTeam = ref(settings.defaultTeam);
const name = ref(settings.name);
const serverStarting = ref(false);

const CUSTOM = "custom";
const selectedMap = ref(Object.keys(defaultMaps)[0]);
const customMap = ref<Blob | null>(null);
const customMapString = ref("");
const customUpload = ref();

const key = ref("");
const players = ref<string[]>();

const createServer = () => {
  key.value = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, "0");

  const peer = new Peer(PEER_ID_PREFIX + key.value);

  peer.on("error", () => {
    peer.destroy();

    createServer();
  });

  peer.once("open", () => {
    peer.off("error");

    const server = new Server(peer);
    server.join(name.value, teams.value[selectedTeam.value] || Team.random());
    server.listen();
  });
};

let timer = -1;
onMounted(() => {
  createServer();

  timer = window.setInterval(() => {
    if (!Server.instance) {
      return;
    }

    players.value = Server.instance.players.map((player) => player.name);
    Server.instance.broadcast({
      type: MessageType.LobbyUpdate,
      map: selectedMap.value,
      players: players.value,
    });
  }, 1000);
});

onUnmounted(() => {
  window.clearInterval(timer);
});

const nameValidator = (name: string) => !!name.trim();

const handleChangeName = (event: Event) => {
  const name = (event.target as HTMLInputElement).value;

  if (nameValidator(name)) {
    Server.instance.rename(name);
  }
};

const handleSelectMap = (map: string) => {
  selectedMap.value = map;
};

const handleUploadMap = (event: Event) => {
  const file = (event.target as HTMLInputElement).files![0];

  if (!file) {
    if (customMap.value) {
      selectedMap.value = CUSTOM;
    }

    return;
  }

  const reader = new FileReader();
  reader.readAsDataURL(file);
  reader.onload = () => {
    customMapString.value = reader.result as string;
    customMap.value = file;
    selectedMap.value = CUSTOM;
  };
};

const handleBack = () => {
  if (serverStarting.value) {
    return;
  }

  if (Server.instance) {
    Server.instance.peer.destroy();
  }

  onBack();
};

const handleStart = async () => {
  if (serverStarting.value) {
    return;
  }

  serverStarting.value = true;
  set("Settings", {
    ...settings,
    name: name.value,
    defaultTeam: selectedTeam.value,
  });

  window.clearInterval(timer);

  if (selectedMap.value === CUSTOM) {
    onPlay(await Map.fromBlob(customMap.value!));
  } else {
    onPlay(
      await Map.fromConfig(AssetsContainer.instance.assets![selectedMap.value])
    );
  }
};
</script>

<template>
  <div class="host">
    <div class="code flex-list">
      <h2>
        Room code: <span class="key">{{ key }}</span>
      </h2>
    </div>

    <div class="flex-list flex-list--wide">
      <h2>Players</h2>
      <ul class="players">
        <li v-for="player in players">{{ player }}</li>
      </ul>
    </div>

    <div class="options flex-list">
      <h2>Settings</h2>
      <Input
        label="name"
        v-model="name"
        :change="handleChangeName"
        :validator="nameValidator"
      />
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

      <label class="label">
        Map
        <ul class="maps">
          <li
            v-for="(url, name) of defaultMaps"
            :class="{ map: true, selected: selectedMap === name }"
            @click="handleSelectMap(name)"
          >
            <span class="truncate mapName">{{ name }}</span>
            <img :src="url" />
          </li>
          <li
            :class="{ map: true, selected: selectedMap === CUSTOM }"
            @click="customUpload.click"
          >
            <span class="truncate mapName">Custom</span>
            <img v-if="customMapString" :src="customMapString" />
            <div v-else class="placeholder">➕ upload</div>
          </li>
        </ul>
      </label>
      <input type="file" hidden @change="handleUploadMap" ref="customUpload" />
    </div>
  </div>

  <div class="buttons">
    <button @click="handleStart" class="primary">Start</button>
    <button @click="handleBack" class="secondary">Back</button>
  </div>
</template>

<style lang="scss" scoped>
.host {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.players {
  padding: 25px;
  background: var(--background);
  box-shadow: 0 0 10px inset var(--primary);
  border-radius: var(--small-radius);
  box-sizing: border-box;
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
    color: var(--primary);
    font-size: 14px;
    font-family: system-ui;
  }
}

.maps {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;

  .map {
    display: flex;
    flex-direction: column;
    width: 200px;
    height: 150px;
    align-items: center;
    border: 2px solid var(--primary);
    border-radius: 5px;
    overflow: hidden;
    background: var(--background);
    cursor: pointer;
    font-family: system-ui;
    font-size: 14px;

    .mapName {
      text-align: center;
      margin: 3px;
      width: calc(100% - 6px);
    }

    img {
      height: 125px;
      width: 100%;
      object-fit: cover;
      image-rendering: pixelated;
      border-top: 2px solid var(--primary);
    }

    &.selected {
      box-shadow: 0 0 5px var(--primary);
    }

    .placeholder {
      border-top: 2px solid var(--primary);
      display: flex;
      flex: 1;
      width: 100%;
      align-items: center;
      justify-content: center;
      font-variant-caps: unicase;
    }
  }
}

.buttons {
  display: flex;
  gap: 10px;
}
</style>
