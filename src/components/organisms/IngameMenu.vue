<script setup lang="ts">
import { useRoute } from "vue-router";
import { Manager } from "../../data/network/manager";
import Dialog from "../molecules/Dialog.vue";

const route = useRoute();
const { onCancel } = defineProps<{
  onCancel: () => void;
}>();

const handleQuit = () => {
  Manager.instance.destroy();
};
</script>

<template>
  <Dialog
    title="Are you sure you want to quit?"
    :onClose="onCancel"
    open
    ingame
  >
    <span class="dialog-buttons">
      <button
        v-if="route.params.id !== '0000'"
        class="primary"
        @click="handleQuit"
        autofocus
      >
        Main menu
      </button>
      <button
        v-if="route.params.id === '0000'"
        class="primary"
        @click="handleQuit"
      >
        Back to builder
      </button>
      <button class="primary" @click="onCancel">Cancel</button>
    </span>
  </Dialog>
</template>

<style lang="scss" scoped>
.dialog-buttons {
  margin-top: 8px;
  display: flex;
  gap: 8px;
  justify-content: center;
  padding: 2px;

  button {
    pointer-events: all;
    cursor: url("../../assets/pointer.png"), auto;
  }
}
</style>
