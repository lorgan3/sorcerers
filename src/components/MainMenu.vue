<script setup lang="ts">
import { ref, watch } from "vue";
import Team from "./Team.vue";
import Builder from "./Builder.vue";
import { AssetsContainer } from "../util/assets/assetsContainer";
import { connect } from "../data/network";
import Hud from "./Hud.vue";
import Host from "./Host.vue";
import Join from "./Join.vue";
import Tutorial from "./Tutorial.vue";
import { Map } from "../data/map";
import Inventory from "./Inventory.vue";
import { Key } from "../data/controller/controller";

enum Menu {
  MainMenu = "Main menu",
  Team = "Team",
  Host = "Host game",
  Join = "Join game",
  Builder = "Builder",
  Game = "Game",
}

const canvas = ref<HTMLDivElement | null>(null);
const inventoryOpen = ref(false);
const menu = ref(Menu.MainMenu);

const container = new AssetsContainer();
let selectedMap: Map;

watch(canvas, (canvas) => {
  if (canvas) {
    container.onComplete(async () => {
      const controller = await connect(canvas, selectedMap, handleBack);
      controller.addKeyListener(Key.M2, () => {
        inventoryOpen.value = !inventoryOpen.value;
      });
    });
  }
});

const handlePlay = (map: Map) => {
  menu.value = Menu.Game;
  selectedMap = map;
};

const handleBack = () => {
  menu.value = Menu.MainMenu;
};

const handleCloseInventory = () => {
  inventoryOpen.value = false;
};
</script>

<template>
  <div v-if="menu === Menu.Game" class="render-target" ref="canvas">
    <Hud />
    <Inventory :isOpen="inventoryOpen" :onClose="handleCloseInventory" />
    <Tutorial />
  </div>
  <div v-else-if="menu === Menu.Builder" class="background">
    <Builder :onBack="handleBack" />
  </div>
  <div v-else class="background background--padded">
    <div class="title-wrapper">
      <h1 :class="{ title: true, 'title--big': menu === Menu.MainMenu }">
        <span>S</span>
        <span>o</span>
        <span>r</span>
        <span>c</span>
        <span>e</span>
        <span>r</span>
        <span>e</span>
        <span>r</span>
        <span>s</span>
      </h1>
      <h2 v-if="menu !== Menu.MainMenu">/ {{ menu }}</h2>
    </div>
    <div v-if="menu === Menu.MainMenu" class="mainMenu">
      <ul class="list flex-list">
        <li><button class="primary" @click="menu = Menu.Team">Team</button></li>
        <li>
          <button class="primary" @click="menu = Menu.Host">Host game</button>
        </li>
        <li>
          <button class="primary" @click="menu = Menu.Join">Join game</button>
        </li>
        <li>
          <button class="primary" @click="menu = Menu.Builder">Builder</button>
        </li>
      </ul>
    </div>

    <Team v-if="menu === Menu.Team" :onBack="handleBack" />
    <Host v-if="menu === Menu.Host" :onBack="handleBack" :onPlay="handlePlay" />
    <Join v-if="menu === Menu.Join" :onBack="handleBack" :onPlay="handlePlay" />
  </div>
</template>

<style lang="scss" scoped>
.render-target {
  display: flex;
}

.background {
  min-height: 100vh;
  box-sizing: border-box;
  background: url("../assets/parchment.png");
  image-rendering: pixelated;
  background-size: 256px;
  display: flex;
  flex-direction: column;
  gap: 20px;

  &--padded {
    box-shadow: 0 0 10vmin inset var(--primary);
    padding: 10vmin 15vmin;
  }

  .title-wrapper {
    display: flex;
    align-items: baseline;
    gap: 6px;

    .title {
      font-size: 48px;
      color: var(--primary);
      user-select: none;
      text-shadow: 0 0 0 var(--highlight);
      transition: all 0.3s linear;

      > * {
        transition: 1s color;

        &:hover {
          color: var(--highlight);
        }
      }

      &--big {
        font-size: 20vw;
        text-shadow: 0 0.5vw 0.5vw var(--highlight);
        letter-spacing: 0.5vw;
      }
    }
  }

  .mainMenu {
    .list {
      background: var(--background);
      box-shadow: 0 0 10px inset var(--primary);
      padding: 30px;
      border-radius: 10px;

      button {
        min-width: 400px;
        max-width: 100%;
        font-size: 32px;
        padding: 10px;
        letter-spacing: 1.5px;
      }
    }
  }
}
</style>
