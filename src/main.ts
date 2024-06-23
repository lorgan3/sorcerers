import { createApp } from "vue";
import App from "./App.vue";
import { RouteRecordRaw, createRouter, createWebHashHistory } from "vue-router";
import Host from "./components/pages/Host.vue";
import Join from "./components/pages/Join.vue";
import Spellbook from "./components/pages/Spellbook.vue";
import MainMenu from "./components/pages/MainMenu.vue";
import Builder from "./components/pages/Builder.vue";
import Header from "./components/Header.vue";
import { Config, Map } from "./data/map";
import { AssetsContainer } from "./util/assets/assetsContainer";
import Game from "./components/pages/Game.vue";
import Credits from "./components/pages/Credits.vue";
import SettingsComponent from "./components/pages/Settings.vue";
import "./util/firebase";
import { GameSettings } from "./util/localStorage/settings";

new AssetsContainer();
let config: Config;
let selectedMap: Map;
let selectedSettings: GameSettings;

const onPlay = async (
  key: string,
  map: Map | Config,
  settings: GameSettings
) => {
  if (map instanceof Map) {
    selectedMap = map;
  } else {
    config = map;
    selectedMap = await Map.fromConfig(map);
  }
  selectedSettings = settings;
  router.replace(`/game/${key}`);
};

const routes: RouteRecordRaw[] = [
  {
    path: "/",
    component: Header,
    children: [
      { path: "", component: MainMenu },
      {
        path: "host",
        component: Host,
        meta: { name: "Host" },
        props: { onPlay },
      },
      {
        path: "join/:id?",
        component: Join,
        meta: { name: "Join" },
        props: { onPlay },
      },
      { path: "spellbook", component: Spellbook, meta: { name: "Spellbook" } },
      { path: "credits", component: Credits, meta: { name: "Credits" } },
      {
        path: "settings",
        component: SettingsComponent,
        meta: { name: "Settings" },
      },
    ],
  },
  {
    path: "/builder",
    component: Builder,
    props: () => ({
      config,
      onPlay,
    }),
  },
  {
    path: "/game/:id",
    component: Game,
    props: () => ({
      selectedMap: selectedMap!,
      settings: selectedSettings!,
    }),
    beforeEnter: (to) => {
      if (!selectedMap) {
        router.replace(`/join/${to.params.id}`);
      }
    },
  },
];

const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

createApp(App).use(router).mount("#app");
