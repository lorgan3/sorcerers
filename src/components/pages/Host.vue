<script setup lang="ts">
import { onMounted, ref, watch } from "vue";
import { get, set } from "../../util/localStorage";
import { GameSettings, defaults } from "../../util/localStorage/settings";
import { MessageType } from "../../data/network/types";
import { Config, Map } from "../../data/map";
import { getServer } from "../../data/context";
import debounce from "lodash.debounce";
import { useRouter } from "vue-router";
import { logEvent } from "../../util/firebase";
import TeamDisplay from "../organisms/TeamDisplay.vue";
import TeamDialog from "../organisms/TeamDialog.vue";
import GameSettingsComponent from "../organisms/GameSettings.vue";
import MapSelect from "../organisms/MapSelect.vue";
import { COLORS } from "../../data/network/constants";
import IconButton from "../atoms/IconButton.vue";
import plus from "pixelarticons/svg/plus.svg";
import { useHostServer } from "./composables/useHostServer";
import { useHostPlayers } from "./composables/useHostPlayers";

const { onPlay } = defineProps<{
  onPlay: (key: string, map: Map | Config, settings: GameSettings) => void;
}>();

const router = useRouter();

const settings = defaults(get("Settings"));

const team = ref(settings.team);

const mapContainer: { map: Map | null; name: string } = {
  map: null,
  name: "",
};

const gameSettings = ref({
  ...settings.gameSettings,
});

const { key, serverStarting, promise, createServer, destroyServer } =
  useHostServer(gameSettings);

watch(
  () => gameSettings.value.teamSize,
  async (newSize) => {
    const server = getServer()!;
    server.teamSize = newSize;
    server.players.forEach((player) => player.team.setSize(newSize));
  }
);

const updateLobby = debounce(() => {
  const server = getServer();
  if (!server || server.started) {
    return;
  }

  players.value = [...server.players];

  for (let i = 0; i < server.players.length; i++) {
    const player = server.players[i];

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

const {
  players,
  localPlayers,
  editingPlayer,
  handleAddLocalPlayer,
  handleKick,
  handleEditPlayer,
  handleClose,
  handleSave,
} = useHostPlayers(updateLobby, gameSettings);

onMounted(async () => {
  promise.value = createServer(settings.name, team.value, (server) => {
    const player = server.addPlayer(settings.name, team.value);
    localPlayers.value.push(player.color);
    server.listen(updateLobby);
  });

  await promise.value;
  updateLobby();
});

const handleBack = () => {
  if (serverStarting.value) {
    return;
  }
  destroyServer();
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
    players: getServer()!.players.length,
    map: mapContainer.name,
  });
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
          v-if="players.length < COLORS.length"
          title="Add local player"
          :onClick="() => handleAddLocalPlayer(settings.name)"
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
          :key="player.color + index"
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
