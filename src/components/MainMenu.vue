<script setup lang="ts">
import { ref, watch } from "vue";
import Team from "./Team.vue";
import Builder from "./Builder.vue";
import { AssetsContainer } from "../util/assets/assetsContainer";
import { connect } from "../data/network";
import Hud from "./Hud.vue";
import Host from "./Host.vue";
import Join from "./Join.vue";
import { Map } from "../data/map";

enum Menu {
  MainMenu,
  Team,
  Host,
  Join,
  Builder,
  Game,
}

const canvas = ref<HTMLDivElement | null>(null);
const menu = ref(Menu.MainMenu);

const container = new AssetsContainer();
let selectedMap: Map;

watch(canvas, (canvas) => {
  if (canvas) {
    container.onComplete(() => {
      connect(canvas, selectedMap);
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
</script>

<template>
  <div class="background">
    <div v-if="menu === Menu.MainMenu" class="mainMenu">
      <h1 class="title">Sorcerers</h1>
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
    <Builder v-if="menu === Menu.Builder" :onBack="handleBack" />

    <div v-if="menu === Menu.Game" class="render-target" ref="canvas">
      <Hud />
    </div>
  </div>
</template>

<style lang="scss" scoped>
.background {
  height: 100%;
  background: #b5a78a;

  .mainMenu {
    position: absolute;
    top: 40vh;
    left: 5vw;

    .title {
      margin-bottom: 30px;
      font-size: 72px;
      letter-spacing: 2px;
      color: #433e34;
    }

    .list {
      background: #9c917b;
      box-shadow: 0 0 10px inset #433e34;
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
