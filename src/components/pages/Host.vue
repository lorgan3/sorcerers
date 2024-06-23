<script setup lang="ts">
import { onMounted, ref, watch } from "vue";
import { get, set } from "../../util/localStorage";
import { GameSettings, defaults } from "../../util/localStorage/settings";
import { Server } from "../../data/network/server";
import { PEER_ID_PREFIX } from "../../data/network/constants";
import { MessageType } from "../../data/network/types";
import Peer from "peerjs";
import { defaultMaps } from "../../util/assets/index";
import { Team } from "../../data/team";
import { Config, Map } from "../../data/map";
import { AssetsContainer } from "../../util/assets/assetsContainer";
import Input from "../atoms/Input.vue";
import { Manager } from "../../data/network/manager";
import { Player } from "../../data/network/player";
import debounce from "lodash.debounce";
import { useRouter } from "vue-router";
import { logEvent } from "../../util/firebase";
import TeamDisplay from "../organisms/TeamDisplay.vue";
import TeamDialog from "../organisms/TeamDialog.vue";
import { IPlayer } from "../types";
import GameSettingsComponent from "../molecules/GameSettings.vue";

const { onPlay } = defineProps<{
  onPlay: (key: string, map: Map | Config, settings: GameSettings) => void;
}>();

const router = useRouter();

const settings = defaults(get("Settings"));

const team = ref(settings.team);
const serverStarting = ref(false);
const localPlayers = ref<string[]>([]);

const CUSTOM = "custom";
const selectedMap = ref(Object.keys(defaultMaps)[0]);
const customMap = ref<Blob | null>(null);
const customMapString = ref("");
const customUpload = ref();

const gameSettings = ref({
  ...settings.gameSettings,
});

const key = ref("");
const players = ref<Player[]>([]);
const promise = ref<Promise<void>>();

const editingPlayer = ref<IPlayer>();

watch(
  () => gameSettings.value.teamSize,
  async (newSize) => {
    Server.instance.teamSize = newSize;
    Server.instance.players.forEach((player) => player.team.setSize(newSize));
  }
);

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
      server.teamSize = gameSettings.value.teamSize;

      const player = server.addPlayer(settings.name, team.value);
      localPlayers.value.push(player.color);

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

  players.value = [...Server.instance.players];

  for (let i = 0; i < Server.instance.players.length; i++) {
    const player = Server.instance.players[i];

    player.connection?.send({
      type: MessageType.LobbyUpdate,
      map: selectedMap.value,
      players: players.value.map((player) => ({
        name: player.name,
        characters: player.team.getLimitedCharacters(),
        color: player.color,
      })),
      you: i,
      settings: gameSettings.value,
    });
  }
}, 200);

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
    name: players.value[0].name,
    team: players.value[0].team,
    gameSettings: gameSettings.value,
  });

  if (selectedMap.value === CUSTOM) {
    onPlay(key.value, await Map.fromBlob(customMap.value!), gameSettings.value);
  } else {
    onPlay(
      key.value,
      await Map.fromConfig(AssetsContainer.instance.assets![selectedMap.value]),
      gameSettings.value
    );
  }

  logEvent("host_game", {
    players: Server.instance.players.length,
    map: selectedMap.value,
  });
};

const handleAddLocalPlayer = () => {
  const team = Team.random(gameSettings.value.teamSize);
  const player = Server.instance.addPlayer(
    `${settings.name} (${players.value?.length})`,
    team
  );
  localPlayers.value.push(player.color);

  updateLobby();
};

const handleKick = (index: number) => {
  const player = Server.instance.players[index];
  const localPlayerIndex = localPlayers.value.findIndex(
    (localPlayer) => localPlayer === player.color
  );

  if (localPlayerIndex !== -1) {
    localPlayers.value.splice(localPlayerIndex, 1);
  }

  Server.instance.kick(Server.instance.players[index]);
  updateLobby();
};

const handleEditPlayer = (player: IPlayer) => {
  editingPlayer.value = player;
};

const handleClose = () => {
  editingPlayer.value = undefined;
  updateLobby();
};

const handleSave = (name: string, characters: string[]) => {
  (editingPlayer.value as Player).rename(
    name,
    Team.fromJson(characters, gameSettings.value.teamSize)
  );

  editingPlayer.value = undefined;
  updateLobby();
};

const handleSaveSettings = (settings: GameSettings) => {
  gameSettings.value = settings;

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

      <div class="teams">
        <TeamDisplay
          v-for="(player, index) in players"
          :key="player.color"
          :player="player"
          :onDelete="index !== 0 ? () => handleKick(index) : undefined"
          :onEdit="!player.connection ? handleEditPlayer : undefined"
        />
        <TeamDialog
          v-if="editingPlayer"
          :player="editingPlayer"
          :onClose="handleClose"
          :onSave="handleSave"
        />
      </div>
    </div>

    <div class="options flex-list flex-list--wide">
      <h2>Map</h2>
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

      <input type="file" hidden @change="handleUploadMap" ref="customUpload" />

      <GameSettingsComponent
        :settings="gameSettings"
        :onEdit="handleSaveSettings"
      />
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

.teams {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
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

.settings {
  max-width: 200px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.buttons {
  display: flex;
  gap: 10px;
}
</style>
