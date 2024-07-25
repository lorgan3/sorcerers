<script setup lang="ts">
import { onMounted, ref } from "vue";
import { get, set } from "../../util/localStorage";
import { GameSettings, defaults } from "../../util/localStorage/settings";
import { Client } from "../../data/network/client";
import { LAST_GAME_KEY, PEER_ID_PREFIX } from "../../data/network/constants";
import { MessageType } from "../../data/network/types";
import { Config, Map } from "../../data/map";
import Input from "../atoms/Input.vue";
import { useRoute, useRouter } from "vue-router";
import { logEvent } from "../../util/firebase";
import { createClient } from "../../data/network";
import TeamDisplay from "../organisms/TeamDisplay.vue";
import TeamDialog from "../organisms/TeamDialog.vue";
import { IPlayer } from "../types";
import GameSettingsComponent from "../organisms/GameSettings.vue";
import { Team } from "../../data/team";

const { onPlay } = defineProps<{
  onPlay: (key: string, map: Map | Config, settings: GameSettings) => void;
}>();
const router = useRouter();
const route = useRoute();

const settings = defaults(get("Settings"));
const gameSettings = ref(settings.gameSettings);
const team = ref(settings.team);
const name = ref(settings.name);
const joined = ref(!!Client.instance);

const key = ref(
  (route.params.id || sessionStorage.getItem(LAST_GAME_KEY) || "") as string
);
const players = ref<IPlayer[]>([]);
const map = ref("");
const you = ref(-1);

const clientPromise = ref<Promise<void>>();
const editingPlayer = ref<IPlayer>();

const keyValidator = (key: string) => /[0-9]{4}/.test(key);

const handleJoin = async () => {
  await clientPromise;

  try {
    await Client.instance.join(
      PEER_ID_PREFIX + key.value,
      name.value.trim() || "Player",
      team.value
    );

    sessionStorage.setItem(LAST_GAME_KEY, key.value);
    joined.value = true;
  } catch (error) {
    console.error(error);
    return;
  }

  handleConnect();
};

const handleConnect = () => {
  Client.instance.onLobbyUpdate(
    async (message) => {
      switch (message.type) {
        case MessageType.LobbyUpdate:
          players.value = message.players.map(({ characters, ...player }) => ({
            ...player,
            team: { getLimitedCharacters: () => characters },
          }));

          map.value = message.map;
          you.value = message.you;
          gameSettings.value = message.settings;

          team.value.setSize(message.settings.teamSize);
          break;

        case MessageType.StartGame:
          onPlay(
            key.value,
            await Map.fromConfig({
              terrain: {
                data: new Blob([message.map.terrain.data]),
                mask: message.map.terrain.mask,
              },
              background: message.map.background
                ? {
                    data: new Blob([message.map.background.data]),
                  }
                : undefined,
              layers: message.map.layers.map((layer) => ({
                ...layer,
                data: new Blob([layer.data]),
              })),
              bbox: message.map.bbox,
              parallax: message.map.parallax,
              scale: message.map.scale,
            }),
            message.settings
          );

          logEvent("join_game");
          break;
      }
    },
    () => {
      console.log("disconnect");
      clientPromise.value = createClient();
      players.value = [];
      joined.value = false;
    }
  );
};

onMounted(() => {
  if (Client.instance) {
    handleConnect();
  } else {
    clientPromise.value = createClient();
  }
});

const handleBack = () => {
  if (Client.instance) {
    Client.instance.destroy();
  }

  router.replace("/");
};

const handleEditPlayer = (player: IPlayer) => {
  editingPlayer.value = player;
};

const handleClose = () => {
  editingPlayer.value = undefined;
};

const handleSave = (name: string, characters: string[]) => {
  Client.instance.broadcast({
    type: MessageType.Join,
    name: name,
    team: characters,
  });

  set("Settings", {
    ...settings,
    name: name,
    team: Team.fromJson(characters, characters.length),
  });

  editingPlayer.value = undefined;
};
</script>

<template>
  <div class="client">
    <template v-if="joined">
      <div class="code flex-list">
        <h2>
          Room code: <span class="key">{{ key }}</span>
        </h2>
      </div>

      <div class="flex-list flex-list--wide">
        <h2>Players</h2>
        <div class="teams">
          <TeamDisplay
            v-for="(player, index) in players"
            :key="player.color"
            :player="player"
            :onEdit="index === you ? handleEditPlayer : undefined"
            :sub-title="index === you ? 'You' : ''"
          />
          <TeamDialog
            v-if="editingPlayer"
            :player="editingPlayer"
            :onClose="handleClose"
            :onSave="handleSave"
          />
        </div>
      </div>

      <GameSettingsComponent :settings="gameSettings" :map="map" />
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
      @click="handleJoin"
      class="primary"
      :disabled="!key"
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

.teams {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
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
