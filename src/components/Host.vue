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

const { onBack, onPlay } = defineProps<{
  onBack: () => void;
  onPlay: () => void;
}>();

const settings = get("Settings") || defaults();

const teams = ref(settings.teams);
const selectedTeam = ref(settings.defaultTeam);
const name = ref(settings.name);

const CUSTOM = "custom";
const selectedMap = ref(Object.keys(defaultMaps)[0]);
const customMap = ref("");
const customUpload = ref();

const key = ref("");
const players = ref<string[]>();

const createServer = () => {
  key.value = Math.floor(Math.random() * 1000)
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

  var reader = new FileReader();
  reader.readAsDataURL(file);
  reader.onload = () => {
    customMap.value = reader.result as string;
    selectedMap.value = CUSTOM;
  };
};

const handleBack = () => {
  if (Server.instance) {
    Server.instance.peer.destroy();
  }

  onBack();
};

const handleStart = () => {
  set("Settings", {
    ...settings,
    name: name.value,
    defaultTeam: selectedTeam.value,
  });

  window.clearInterval(timer);

  onPlay();
};
</script>

<template>
  <div class="background">
    <h1>Host</h1>
    <div class="host">
      <div class="code flex-list">
        <h3>
          Room code: <span class="key">{{ key }}</span>
        </h3>

        <div class="flex-list">
          <h3>Players</h3>
          <ul class="players">
            <li v-for="player in players">{{ player }}</li>
          </ul>
        </div>
      </div>

      <div class="options flex-list">
        <h3>Settings</h3>
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

        <label>
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
              <img v-if="customMap" :src="customMap" />
              <div v-else class="placeholder">➕ upload</div>
            </li>
          </ul>
        </label>
        <input
          type="file"
          hidden
          @change="handleUploadMap"
          ref="customUpload"
        />
      </div>
    </div>

    <div class="buttons">
      <button @click="handleStart" class="primary">Start</button>
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

.host {
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
    border: 2px solid #433e34;
    border-radius: 5px;
    overflow: hidden;
    background: #9c917b;
    cursor: pointer;

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
      border-top: 2px solid #433e34;
    }

    &.selected {
      box-shadow: 0 0 5px #433e34;
    }

    .placeholder {
      border-top: 2px solid #433e34;
      display: flex;
      flex: 1;
      width: 100%;
      align-items: center;
      justify-content: center;
      opacity: 0.6;
      font-variant-caps: unicase;
    }
  }
}

.buttons {
  display: flex;
  gap: 10px;
}
</style>
