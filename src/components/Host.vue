<script setup lang="ts">
import { onMounted, ref } from "vue";
import { get, set } from "../util/localStorage";
import { defaults } from "../util/localStorage/settings";
import { Server } from "../data/network/server";
import { PEER_ID_PREFIX } from "../data/network/constants";
import { MessageType } from "../data/network/types";
import Peer from "peerjs";
import { defaultMaps } from "../util/assets/index";
import { Team } from "../data/team";
import { Config, Map } from "../data/map";
import { AssetsContainer } from "../util/assets/assetsContainer";
import Input from "./Input.vue";
import { Manager } from "../data/network/manager";
import { Player } from "../data/network/player";
import debounce from "lodash.debounce";
import { useRouter } from "vue-router";

const { onPlay } = defineProps<{
  onPlay: (key: string, map: Map | Config) => void;
}>();

const router = useRouter();

const settings = get("Settings") || defaults();

const teams = ref(settings.teams);
const serverStarting = ref(false);
const localPlayers = ref<Array<{ name: string; team: number; ref: Player }>>(
  []
);

const CUSTOM = "custom";
const selectedMap = ref(Object.keys(defaultMaps)[0]);
const customMap = ref<Blob | null>(null);
const customMapString = ref("");
const customUpload = ref();

const key = ref("");
const players = ref<string[]>([]);
let promise = ref<Promise<void>>();

const createServer = () =>
  new Promise<void>((resolve) => {
    Manager.instance?.destroy();

    key.value = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, "0");

    const peer = new Peer(PEER_ID_PREFIX + key.value);

    peer.on("error", () => {
      createServer().then(resolve);
    });

    peer.once("open", () => {
      peer.off("error");

      const server = new Server(peer);
      const player = server.addPlayer(
        settings.name,
        teams.value[settings.defaultTeam] || Team.random()
      );
      localPlayers.value.push({
        name: player.name,
        team: settings.defaultTeam,
        ref: player,
      });

      server.listen(updateLobby);
      resolve();
    });
  });

onMounted(async () => {
  promise.value = createServer();

  await promise.value;
  updateLobby();
});

const updateLobby = debounce(() => {
  if (!Server.instance) {
    return;
  }

  players.value = Server.instance.players.map((player) => player.name);
  Server.instance.broadcast({
    type: MessageType.LobbyUpdate,
    map: selectedMap.value,
    players: players.value,
  });
}, 200);

const nameValidator = (name: string) => !!name.trim();

const handleChangeName = (event: Event, index: number) => {
  const name = (event.target as HTMLInputElement).value;

  if (nameValidator(name)) {
    localPlayers.value[index].ref.rename(name);
    updateLobby();
  }
};

const handleChangeTeam = (event: Event, index: number) => {
  const teamIndex = Number((event.target as HTMLSelectElement).value);
  localPlayers.value[index].ref.team = teams.value[teamIndex] || Team.random();
};

const handleSelectMap = (map: string) => {
  selectedMap.value = map;
  updateLobby();
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
    Server.instance.destroy();
  }

  router.replace("/");
};

const handleStart = async () => {
  if (serverStarting.value) {
    return;
  }
  await promise.value;

  serverStarting.value = true;
  set("Settings", {
    ...settings,
    name: localPlayers.value[0].name,
    defaultTeam: localPlayers.value[0].team,
  });

  if (selectedMap.value === CUSTOM) {
    onPlay(key.value, await Map.fromBlob(customMap.value!));
  } else {
    onPlay(
      key.value,
      await Map.fromConfig(AssetsContainer.instance.assets![selectedMap.value])
    );
  }
};

const handleAddLocalPlayer = () => {
  const player = Server.instance.addPlayer(
    `${settings.name} (${players.value?.length})`,
    Team.random()
  );
  localPlayers.value.push({
    name: player.name,
    team: -1,
    ref: player,
  });

  updateLobby();
};

const handleKick = (index: number) => {
  const player = Server.instance.players[index];
  const localPlayerIndex = localPlayers.value.findIndex(
    (localPlayer) => localPlayer.ref.name === player.name && !player.connection
  );

  if (localPlayerIndex !== -1) {
    localPlayers.value.splice(localPlayerIndex, 1);
  }

  Server.instance.kick(Server.instance.players[index]);
  updateLobby();
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
      <h2>
        Players
        <button
          v-if="players.length < 4"
          class="icon-button"
          title="Add local player"
          @click="handleAddLocalPlayer"
        >
          ➕
        </button>
      </h2>
      <ul class="players">
        <li v-for="(player, index) in players">
          {{ player }}
          <button
            v-if="index > 0"
            class="icon-button"
            title="Kick"
            @click="handleKick(index)"
          >
            ✖️
          </button>
        </li>
      </ul>
    </div>

    <div class="options flex-list flex-list--wide">
      <h2>Settings</h2>
      <div class="player-input">
        <div v-for="(player, index) in localPlayers">
          <Input
            label="Player name"
            v-model="localPlayers[index].name"
            :change="(event) => handleChangeName(event, index)"
            :validator="nameValidator"
          />
          <label class="label">
            Player team
            <select
              v-model="localPlayers[index].team"
              @change="(event) => handleChangeTeam(event, index)"
            >
              <option value="-1">Random</option>
              <option v-for="(team, index) in teams" :value="index">
                {{ team.name }}
              </option>
            </select>
            <span class="meta"
              >({{ player.ref.team.characters.join(", ") }})</span
            >
          </label>
        </div>
      </div>

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

  .player-input {
    display: grid;
    gap: 6px;
    grid-template-columns: 1fr 1fr;

    > div {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
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
