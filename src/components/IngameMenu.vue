<script setup lang="ts">
import { Manager } from "../data/network/manager";

const { onCancel } = defineProps<{
  onCancel: () => void;
}>();

const handleQuit = () => {
  Manager.instance.destroy();
};
</script>

<template>
  <div class="overlay">
    <p class="text">
      Are you sure you want to quit?
      <span class="buttons">
        <button class="primary" @click="handleQuit">Main menu</button>
        <button class="primary" @click="onCancel">Cancel</button>
      </span>
    </p>
  </div>
</template>

<style lang="scss" scoped>
.overlay {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  background: rgba(0, 0, 0, 0.5);

  .text {
    position: absolute;
    translate: calc(50vw - 50%) calc(50vh - 50%);
    width: 400px;
    text-wrap: pretty;
    text-align: center;
    font-size: 24px;
    background: #b5a78a;
    border: 4px solid #433e34;
    padding: 10px;
    width: 50%;
    border-radius: 8px;
    box-shadow: 5px 5px 10px #00000069;

    .buttons {
      display: block;
      margin-top: 8px;
      display: flex;
      gap: 8px;
      justify-content: center;

      button {
        pointer-events: all;
      }
    }
  }
}
</style>
