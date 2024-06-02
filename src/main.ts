import { createApp } from "vue";
import App from "./App.vue";
import { RouteRecordRaw, createRouter, createWebHashHistory } from "vue-router";
import Host from "./components/Host.vue";
import Join from "./components/Join.vue";
import Spellbook from "./components/Spellbook.vue";
import Team from "./components/Team.vue";
import MainMenu from "./components/MainMenu.vue";
import Builder from "./components/Builder.vue";
import Header from "./components/Header.vue";
import { Config, Map } from "./data/map";
import { AssetsContainer } from "./util/assets/assetsContainer";
import Game from "./components/Game.vue";
import Credits from "./components/Credits.vue";

new AssetsContainer();
let config: Config;
let selectedMap: Map;

const onPlay = async (key: string, map: Map | Config) => {
  if (map instanceof Map) {
    selectedMap = map;
  } else {
    config = map;
    selectedMap = await Map.fromConfig(map);
  }
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
