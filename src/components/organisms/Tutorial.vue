<script setup lang="ts">
import { ref } from "vue";
import { get, set } from "../../util/localStorage";
import { defaults } from "../../util/localStorage/settings";

const { setHudState, setInventoryState } = defineProps<{
  setHudState: (open: boolean) => void;
  setInventoryState: (open: boolean) => void;
}>();

interface TutorialMessage {
  center?: {
    x: string;
    y: string;
  };
  focus?: {
    x: string;
    y: string;
    radius: string;
  };
  text: {
    x: string;
    y: string;
    value: string;
  };
  actions: Array<{
    label: string;
    fn: () => void;
  }>;
}

const TUTORIAL: TutorialMessage[] = [
  {
    text: {
      x: "-50%",
      y: "0px",
      value:
        "Welcome to Sorcerers! This quick tutorial will explain the basics of the game.",
    },
    actions: [
      {
        label: "Show me",
        fn: () => (message.value = TUTORIAL[++tutorialIndex.value]),
      },
      {
        label: "Skip",
        fn: () => {
          message.value = undefined;
          set("Settings", {
            ...settings,
            tutorialDone: true,
          });
        },
      },
    ],
  },
  {
    center: {
      x: "0vw",
      y: "100vh",
    },
    focus: {
      x: "134px",
      y: "-109px",
      radius: "124px",
    },
    text: {
      x: "262px",
      y: "-114px",
      value:
        "The HUD contains important information about your turn time, the game time, how much mana you have and which elements are buffed (big and glowing) or nerfed (small and faded).",
    },
    actions: [
      {
        label: "Next",
        fn: () => {
          message.value = TUTORIAL[++tutorialIndex.value];
          setHudState(true);
        },
      },
    ],
  },
  {
    center: {
      x: "0vw",
      y: "100vh",
    },
    focus: {
      x: "134px",
      y: "-179px",
      radius: "124px",
    },
    text: {
      x: "262px",
      y: "-194px",
      value: "Hover over the HUD to quickly check the health of all characters",
    },
    actions: [
      {
        label: "Next",
        fn: () => {
          message.value = TUTORIAL[++tutorialIndex.value];
          setHudState(false);
          setInventoryState(true);
        },
      },
    ],
  },
  {
    center: {
      x: "100vw",
      y: "90vh",
    },
    focus: {
      x: "-150px",
      y: "-190px",
      radius: "190px",
    },
    text: {
      x: "-750px",
      y: "-160px",
      value:
        "Right click to open your spell book. More powerful spells cost more mana which you get at the start of your turn and from items.",
    },
    actions: [
      {
        label: "Next",
        fn: () => (message.value = TUTORIAL[++tutorialIndex.value]),
      },
    ],
  },
  {
    text: {
      x: "-50%",
      y: "0px",
      value:
        "Most spells are activated by clicking or holding the left mouse button. Now you're ready to cast some magic!",
    },
    actions: [
      {
        label: "Finish",
        fn: () => {
          message.value = TUTORIAL[++tutorialIndex.value];
          set("Settings", {
            ...settings,
            tutorialDone: true,
          });
        },
      },
    ],
  },
];

const settings = defaults(get("Settings"));
const tutorialIndex = ref(0);
const message = ref<TutorialMessage | undefined>(
  settings.tutorialDone ? undefined : TUTORIAL[tutorialIndex.value]
);
</script>

<template>
  <div
    v-if="message"
    class="overlay"
    :style="{
      '--cx': message.center?.x || '50vw',
      '--cy': message.center?.y || '50vh',
      '--fx': message.focus?.x || '0',
      '--fy': message.focus?.y || '0',
      '--r': message.focus?.radius || '0',
    }"
  >
    <p class="text" :style="{ '--tx': message.text.x, '--ty': message.text.y }">
      {{ message.text.value }}
      <span class="buttons">
        <button v-for="action in message.actions" @click="action.fn">
          {{ action.label }}
        </button>
      </span>
    </p>
  </div>
</template>

<style lang="scss" scoped>
.overlay {
  --cx: 0%;
  --cy: 0%;
  --r: 100px;
  --fx: 0px;
  --fy: 0px;

  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  background: rgba(0, 0, 0, 0.5);
  mask-image: radial-gradient(
    var(--r) at calc(var(--cx) + var(--fx)) calc(var(--cy) + var(--fy)),
    transparent 95%,
    black 100%
  );
  pointer-events: none;

  .text {
    position: absolute;
    color: #fff;
    translate: calc(var(--cx) + var(--tx)) calc(var(--cy) + var(--ty) - 50%);
    width: 400px;
    text-wrap: pretty;
    text-align: center;

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
