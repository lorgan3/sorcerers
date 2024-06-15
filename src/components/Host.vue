<script setup lang="ts">
import { onMounted, ref, watch } from "vue";
import { get, set } from "../util/localStorage";
import { defaults } from "../util/localStorage/settings";
import { Server } from "../data/network/server";
import { PEER_ID_PREFIX } from "../data/network/constants";
import { MessageType, Settings } from "../data/network/types";
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
import TeamInput from "./Team.vue";
import Tooltip from "./Tooltip.vue";

const { onPlay } = defineProps<{
  onPlay: (key: string, map: Map | Config, settings: Settings) => void;
}>();

const router = useRouter();

const settings = defaults(get("Settings"));

const team = ref(settings.team);
const serverStarting = ref(false);
const localPlayers = ref<Array<{ name: string; team: Team; ref: Player }>>([]);

const CUSTOM = "custom";
const selectedMap = ref(Object.keys(defaultMaps)[0]);
const customMap = ref<Blob | null>(null);
const customMapString = ref("");
const customUpload = ref();
const teamSize = ref(settings.teamSize);
const gameDuration = ref(settings.gameLength);
const turnDuration = ref(settings.turnLength);
const trustClients = ref(settings.trustClient);
const manaMultiplier = ref(settings.manaMultiplier * 100);
const itemSpawnChance = ref(settings.itemSpawnChance * 100);

const key = ref("");
const players = ref<string[]>([]);
let promise = ref<Promise<void>>();

watch(teamSize, async (newSize) => {
  team.value.setSize(newSize);
  localPlayers.value.forEach((player) => player.team.setSize(newSize));
});

const createSettings = () => {
  return {
    ...Manager.defaultSettings,
    turnLength: turnDuration.value * 1000,
    gameLength: gameDuration.value * 60 * 1000,
    trustClient: trustClients.value,
    teamSize: teamSize.value,
    manaMultiplier: manaMultiplier.value / 100,
    itemSpawnChance: itemSpawnChance.value / 100,
  } satisfies Settings;
};

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
      const player = server.addPlayer(settings.name, team.value);
      localPlayers.value.push({
        name: player.name,
        team: player.team,
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

  for (let i = 0; i < Server.instance.players.length; i++) {
    const player = Server.instance.players[i];

    player.connection?.send({
      type: MessageType.LobbyUpdate,
      map: selectedMap.value,
      players: players.value,
      you: i,
      settings: createSettings(),
    });
  }
}, 200);

const nameValidator = (name: string) => !!name.trim();

const handleChangeName = (event: Event, index: number) => {
  const name = (event.target as HTMLInputElement).value;

  if (nameValidator(name)) {
    localPlayers.value[index].ref.rename(name);
    updateLobby();
  }
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
    team: localPlayers.value[0].team,
    turnLength: turnDuration.value,
    gameLength: gameDuration.value,
    trustClient: trustClients.value,
    teamSize: teamSize.value,
    manaMultiplier: manaMultiplier.value / 100,
    itemSpawnChance: itemSpawnChance.value / 100,
  });

  if (selectedMap.value === CUSTOM) {
    onPlay(key.value, await Map.fromBlob(customMap.value!), createSettings());
  } else {
    onPlay(
      key.value,
      await Map.fromConfig(AssetsContainer.instance.assets![selectedMap.value]),
      createSettings()
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
    team: Team.random(),
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
          <TeamInput v-model="localPlayers[index].team" />
        </div>
      </div>

      <label class="label">
        <h3>Map</h3>
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

      <div className="settings">
        <Input
          label="Team size"
          v-model="teamSize"
          :min="1"
          :max="10"
          :change="updateLobby"
        />
        <Input
          label="Turn duration (seconds)"
          v-model="turnDuration"
          :min="5"
          :change="updateLobby"
        />
        <Input
          label="Game duration (minutes)"
          v-model="gameDuration"
          :min="0"
          :change="updateLobby"
        />
        <Input
          label="Mana gain multiplier (pct)"
          v-model="manaMultiplier"
          :min="0"
          :max="2500"
          :change="updateLobby"
        />
        <Input
          label="Item spawn chance (pct)"
          v-model="itemSpawnChance"
          :min="0"
          :max="100"
          :change="updateLobby"
        />
        <label class="input-label checkbox-label">
          <input type="checkbox" v-model="trustClients" />
          <span class="checkmark"></span>
          <Tooltip
            text="Hides lag (ping) for players but might allow cheating"
            direction="center-right"
          >
            <span class="label">Active player has control</span>
          </Tooltip>
        </label>
      </div>
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
  gap: 15px;

  label {
    display: flex;
    flex-direction: column;
    gap: 6px;
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

.settings {
  max-width: 200px;
  display: flex;
  flex-direction: column;
  gap: 10px;

  .checkbox-label {
    flex-direction: row;
    white-space: nowrap;
    position: relative;
    padding-left: 30px;
    line-height: 25px;

    .label {
      margin-right: 10px;
    }

    /* Hide the browser's default checkbox */
    input {
      position: absolute;
      opacity: 0;
      cursor: pointer;
      height: 0;
      width: 0;
    }

    /* Create a custom checkbox */
    .checkmark {
      position: absolute;
      top: 0;
      left: 0;
      height: 25px;
      width: 25px;
      background-color: var(--background);
    }

    /* On mouse-over, add a grey background color */
    &:hover input ~ .checkmark {
      background-color: var(--background-dark);
    }

    /* When the checkbox is checked, add a blue background */
    input:checked ~ .checkmark {
      background-color: var(--highlight-background);
    }

    /* Create the checkmark/indicator (hidden when not checked) */
    .checkmark:after {
      content: "";
      position: absolute;
      display: none;
    }

    /* Show the checkmark when checked */
    input:checked ~ .checkmark:after {
      display: block;
    }

    /* Style the checkmark/indicator */
    .checkmark:after {
      left: 9px;
      top: 5px;
      width: 5px;
      height: 10px;
      border: solid var(--highlight);
      border-width: 0 3px 3px 0;
      -webkit-transform: rotate(45deg);
      -ms-transform: rotate(45deg);
      transform: rotate(45deg);
    }
  }
}

.buttons {
  display: flex;
  gap: 10px;
}
</style>
