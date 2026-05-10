<script setup lang="ts">
import { ref, watch } from "vue";
import Dialog from "../molecules/Dialog.vue";
import Input from "../atoms/Input.vue";
import { createClient } from "../../data/network";
import { LAST_GAME_KEY } from "../../data/network/constants";
import { Client } from "../../data/network/client";
import Tooltip from "../atoms/Tooltip.vue";
import { useRouter } from "vue-router";
import { joinByKey } from "../../data/network/joinByKey";

const props = defineProps<{
  open: boolean;
  onClose: () => void;
}>();

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
    await joinByKey(key.value, {
      router,
      onError: () => {
        status.value = "";
        error.value = true;
      },
    });
  } catch {
    // onError already updated state
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
        <span class="icon spinner">߷</span>
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
    line-height: 15px;
    width: 18px;
    height: 18px;
    font-size: 20px;
    margin-bottom: 10px;
    margin-left: 10px;
  }
}

.join-button {
  margin: 6px auto;
}
</style>
