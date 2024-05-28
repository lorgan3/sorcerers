<script setup lang="ts">
import { ref, watch } from "vue";
import { AssetsContainer } from "../util/assets/assetsContainer";
import { connect } from "../data/network";
import Hud from "./Hud.vue";
import Tutorial from "./Tutorial.vue";
import { Map } from "../data/map";
import Inventory from "./Inventory.vue";
import { Controller, Key } from "../data/controller/controller";
import { useRouter } from "vue-router";
import IngameMenu from "./IngameMenu.vue";

const { selectedMap } = defineProps<{
  selectedMap: Map;
}>();

const canvas = ref<HTMLDivElement | null>(null);
const inventoryOpen = ref(false);
const menuOpen = ref(false);
const controller = ref<Controller>();
const router = useRouter();

watch(canvas, (canvas) => {
  if (canvas) {
    AssetsContainer.instance.onComplete(async () => {
      controller.value = await connect(canvas, selectedMap, handleBack);
      controller.value.addKeyListener(Key.M2, () => {
        inventoryOpen.value = !inventoryOpen.value;
        controller.value!.setKey(Key.Inventory, inventoryOpen.value);
      });

      controller.value.addKeyListener(Key.Escape, () => {
        menuOpen.value = !menuOpen.value;
      });
    });
  }
});

const handleBack = () => {
  router.replace("/");
};

const handleCloseInventory = () => {
  inventoryOpen.value = false;
  controller.value!.setKey(Key.Inventory, inventoryOpen.value);
};

const handleCancel = () => {
  menuOpen.value = false;
};
</script>

<template>
  <div class="render-target" ref="canvas">
    <Hud />
    <Inventory :isOpen="inventoryOpen" :onClose="handleCloseInventory" />
    <Tutorial />
    <IngameMenu v-if="menuOpen" :onCancel="handleCancel" />
  </div>
</template>

<style lang="scss" scoped>
.render-target {
  display: flex;
  cursor: url("../assets/pointer.png"), auto;

  &--no-pointer {
    cursor: none;
  }
}
</style>
