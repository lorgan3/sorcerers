<script setup lang="ts">
import { onMounted, ref, watch } from "vue";
import { get, set } from "../../util/localStorage";
import { GameSettings, defaults } from "../../util/localStorage/settings";
import { Server } from "../../data/network/server";
import { PEER_ID_PREFIX } from "../../data/network/constants";
import { MessageType } from "../../data/network/types";
import Peer from "peerjs";
import { Team } from "../../data/team";
import { Config, Map } from "../../data/map";
import { Manager } from "../../data/network/manager";
import { Player } from "../../data/network/player";
import debounce from "lodash.debounce";
import { useRouter } from "vue-router";
import { logEvent } from "../../util/firebase";
import TeamDisplay from "../organisms/TeamDisplay.vue";
import TeamDialog from "../organisms/TeamDialog.vue";
import { IPlayer } from "../types";
import GameSettingsComponent from "../organisms/GameSettings.vue";
import MapSelect from "../organisms/MapSelect.vue";
import { COLORS } from "../../data/network/constants";
import IconButton from "../atoms/IconButton.vue";
import plus from "pixelarticons/svg/plus.svg";

const { onPlay } = defineProps<{
  onPlay: (key: string, map: Map | Config, settings: GameSettings) => void;
}>();

const router = useRouter();

const settings = defaults(get("Settings"));

const team = ref(settings.team);
const serverStarting = ref(false);
const localPlayers = ref<string[]>([]);

const mapContainer: { map: Map | null; name: string } = {
  map: null,
  name: "",
};

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
  if (!Server.instance || Server.instance.started) {
    return;
  }

  players.value = [...Server.instance.players];

  for (let i = 0; i < Server.instance.players.length; i++) {
    const player = Server.instance.players[i];

    player.connection?.send({
      type: MessageType.LobbyUpdate,
      map: mapContainer.name,
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
  if (serverStarting.value || !mapContainer.map) {
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

  onPlay(key.value, mapContainer.map, gameSettings.value);

  logEvent("host_game", {
    players: Server.instance.players.length,
    map: mapContainer.name,
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

const handleSelectMap = async (config: Config, name: string) => {
  mapContainer.map = await Map.fromConfig(config);
  mapContainer.name = name;

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
        <IconButton
          v-if="players.length < 4"
          title="Add local player"
          :onClick="handleAddLocalPlayer"
          :icon="plus"
        />
      </h2>

      <div class="teams">
        <TeamDisplay
          v-if="players.length === 0"
          :player="{
            name: settings.name,
            color: COLORS.at(-1)!,
            team: settings.team,
          }"
        />
        <TeamDisplay
          v-for="(player, index) in players"
          :key="player.color"
          :player="player"
          :onDelete="index !== 0 ? () => handleKick(index) : undefined"
          :onEdit="!player.connection ? handleEditPlayer : undefined"
          :subTitle="!player.connection ? 'Local player' : ''"
        />
        <TeamDialog
          v-if="editingPlayer"
          :player="editingPlayer"
          :onClose="handleClose"
          :onSave="handleSave"
        />
      </div>
    </div>

    <label>
      <h2>Map</h2>
      <MapSelect :onEdit="handleSelectMap" defaultMap="Playground" />
    </label>

    <GameSettingsComponent
      :settings="gameSettings"
      :onEdit="handleSaveSettings"
    />
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
