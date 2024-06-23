<script setup lang="ts">
import { ref, watch } from "vue";
import Dialog from "../molecules/Dialog.vue";
import Input from "../atoms/Input.vue";
import { createClient } from "../../data/network";
import { LAST_GAME_KEY, PEER_ID_PREFIX } from "../../data/network/constants";
import { defaults } from "../../util/localStorage/settings";
import { get } from "../../util/localStorage";
import { Client } from "../../data/network/client";
import { Team } from "../../data/team";
import Tooltip from "../atoms/Tooltip.vue";
import { useRouter } from "vue-router";

const props = defineProps<{
  open: boolean;
  onClose: () => void;
}>();

const settings = defaults(get("Settings"));
const key = ref(sessionStorage.getItem(LAST_GAME_KEY) || ("" as string));
const status = ref("");
const error = ref(false);
const router = useRouter();
const clientPromise = ref<Promise<void>>();

watch(
  () => props.open,
  () => {
    if (props.open && !Client.instance) {
      status.value = "Creating client";
      clientPromise.value = createClient();

      clientPromise.value.then(() => (status.value = ""));
    }
  },
  { immediate: true }
);

const handleConnect = async () => {
  await clientPromise.value;

  status.value = "Connecting to server";
  error.value = false;

  try {
    await Client.instance.join(
      PEER_ID_PREFIX + key.value,
      settings.name || "Player",
      settings.team || Team.random()
    );

    sessionStorage.setItem(LAST_GAME_KEY, key.value);
    router.replace(`/join/${key.value}`);
  } catch {
    status.value = "";
    error.value = true;
  }
};
</script>

<template>
  <Dialog :open="open" :onClose="props.onClose" title="Join game">
    <div class="code">
      <Input autofocus v-model="key" label="Room code" :error="error" />
      <Tooltip
        v-if="status"
        direction="center-right"
        :text="status"
        to="#dialog"
      >
        <span class="icon icon--spinning">߷</span>
      </Tooltip>
    </div>
    <button @click="handleConnect" class="primary join-button" :disabled="!key">
      Connect
    </button>
  </Dialog>
</template>

<style lang="scss" scoped>
.code {
  display: flex;
  align-items: flex-end;
  padding: 2px;
  overflow: hidden;

  .wrapper {
    flex: 1;
  }

  .icon {
    display: inline-block;
    transform-origin: 50%;
    line-height: 15px;
    width: 18px;
    height: 18px;
    font-size: 20px;
    margin-bottom: 10px;
    margin-left: 10px;

    &--spinning {
      animation: spin 0.5s linear infinite;
    }
  }
}

.join-button {
  margin: 6px auto;
}
</style>
