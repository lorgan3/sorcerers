<script setup lang="ts">
import { onMounted, ref } from "vue";
import { get, set } from "../util/localStorage";
import { defaults } from "../util/localStorage/settings";
import Peer from "peerjs";
import { Client } from "../data/network/client";
import { PEER_ID_PREFIX } from "../data/network/constants";
import { MessageType, Settings } from "../data/network/types";
import { Config, Map } from "../data/map";
import Input from "./Input.vue";
import { Manager } from "../data/network/manager";
import { useRoute, useRouter } from "vue-router";
import TeamInput from "./Team.vue";
import debounce from "lodash.debounce";

const LAST_GAME_KEY = "lastGameKey";

const { onPlay } = defineProps<{
  onPlay: (key: string, map: Map | Config, settings: Settings) => void;
}>();
const router = useRouter();
const route = useRoute();

const settings = defaults(get("Settings"));

const team = ref(settings.team);
const name = ref(settings.name);
const connecting = ref(false);
const clientReady = ref(false);

const key = ref(
  (route.params.id || sessionStorage.getItem(LAST_GAME_KEY) || "") as string
);
const players = ref<string[]>([]);
const map = ref("");
const you = ref(-1);
const gameDuration = ref(0);
const turnDuration = ref(0);
const manaMultiplier = ref(0);
const itemSpawnChance = ref(0);

const nameValidator = (name: string) => !!name.trim();
const keyValidator = (key: string) => /[0-9]{4}/.test(key);
const numberFormatter = new Intl.NumberFormat("en");

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
    team: team.value,
  });

  try {
    await Client.instance.join(
      PEER_ID_PREFIX + key.value,
      name.value.trim() || "Player",
      team.value
    );

    sessionStorage.setItem(LAST_GAME_KEY, key.value);
  } catch {
    connecting.value = false;
    return;
  }

  Client.instance.onLobbyUpdate(
    (message) => {
      switch (message.type) {
        case MessageType.LobbyUpdate:
          players.value = message.players;
          map.value = message.map;
          you.value = message.you;
          gameDuration.value = message.settings.gameLength / 60 / 1000;
          turnDuration.value = message.settings.turnLength / 1000;
          manaMultiplier.value = message.settings.manaMultiplier * 100;
          itemSpawnChance.value = message.settings.itemSpawnChance * 100;

          team.value.setSize(message.settings.teamSize);
          break;

        case MessageType.StartGame:
          onPlay(
            key.value,
            {
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
              parallax: message.map.parallax,
            },
            message.settings
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

const handleChange = debounce(() => {
  if (nameValidator(name.value) && team.value.isValid()) {
    Client.instance.broadcast({
      type: MessageType.Join,
      name: name.value,
      team: team.value.serialize(),
    });
  }
}, 500);

onMounted(() => createClient());

const handleBack = () => {
  if (Client.instance) {
    Client.instance.destroy();
  }

  router.replace("/");
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
          <li
            v-for="(player, i) in players"
            :class="{ 'player-you': i === you }"
          >
            {{ player }}
          </li>
          <li v-if="!players.length">Connecting...</li>
        </ul>
      </div>

      <Input
        label="Player name"
        v-model="name"
        :validator="nameValidator"
        :change="handleChange"
      />
      <TeamInput v-model="team" :change="handleChange" />

      <div class="flex-list">
        <h3>Map</h3>
        {{ map }}
        <h3>Game duration</h3>
        {{
          gameDuration ? `${numberFormatter.format(gameDuration)} minutes` : "-"
        }}
        <h3>Turn duration</h3>
        {{
          turnDuration ? `${numberFormatter.format(turnDuration)} seconds` : "-"
        }}
        <h3>Mana multiplier</h3>
        {{
          manaMultiplier ? `${numberFormatter.format(manaMultiplier)} pct` : "-"
        }}
        <h3>Item spawn chance</h3>
        {{
          itemSpawnChance
            ? `${numberFormatter.format(itemSpawnChance)} pct`
            : "-"
        }}
      </div>
    </template>

    <div v-else class="options flex-list">
      <h2>Settings</h2>
      <Input
        label="Room key"
        v-model="key"
        autofocus
        :validator="keyValidator"
      />
    </div>
  </div>

  <div class="buttons">
    <button
      v-if="!players.length"
      @click="handleConnect"
      class="primary"
      :disabled="
        !key || !nameValidator(name) || !team.isValid() || !clientReady
      "
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

  .player-you {
    font-weight: bold;
  }
}

.options {
  width: 300px;

  label {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
}

.buttons {
  display: flex;
  gap: 10px;
}
</style>
