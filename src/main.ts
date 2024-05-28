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
import { Map } from "./data/map";
import { AssetsContainer } from "./util/assets/assetsContainer";
import Game from "./components/Game.vue";

new AssetsContainer();
let selectedMap: Map;

const onPlay = (key: string, map: Map) => {
  selectedMap = map;
  router.replace(`/game/${key}`);
};

const routes: RouteRecordRaw[] = [
  {
    path: "/",
    component: Header,
    children: [
      { path: "", component: MainMenu },
      { path: "team", component: Team, meta: { name: "Team" } },
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
    ],
  },
  { path: "/builder", component: Builder, props: { onPlay } },
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
