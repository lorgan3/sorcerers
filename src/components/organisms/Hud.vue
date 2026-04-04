<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, shallowRef, triggerRef } from "vue";
import { getManager, getServer } from "../../data/context";
import { Player } from "../../data/network/player";
import { Popup } from "../../data/network/types";
import { Element } from "../../data/spells/types";
import { ELEMENT_MAP } from "../../graphics/elements";
import { DEFAULT_ELEMENT_VALUE, MAX_MANA } from "../../data/network/constants";
import { AccumulatedStat } from "../../data/network/accumulatedStat";
import EndGameDialog from "./EndGameDialog.vue";
import IconButton from "../atoms/IconButton.vue";
import close from "pixelarticons/svg/close.svg";

interface ActivePopup extends Popup {
  out: boolean;
}

const numberFormatter = new Intl.DateTimeFormat("en-GB", {
  minute: "2-digit",
  second: "2-digit",
});

const { forceOpen } = defineProps<{
  forceOpen: boolean;
}>();

const elements = shallowRef(
  Object.fromEntries(
    Object.values(Element).map((element) => [element, DEFAULT_ELEMENT_VALUE])
  ) as Record<Element, number>
);
const turnTime = ref(0);
const gameTime = ref(0);
const mana = ref(0);
const players = ref<Player[]>([]);
const activePlayer = ref<Player | null>(null);
const popup = ref<ActivePopup | null>(null);
const maxHp = ref(1);
const stats = ref<AccumulatedStat<unknown>[] | null>(null);

const poll = () => {
  if (!getManager()) {
    return;
  }

  const data = getManager().getHudData();

  let elementsChanged = false;
  const currentElements = elements.value;
  for (const element of Object.values(Element)) {
    const newValue = getManager().getElementValue(element);
    if (newValue !== currentElements[element]) {
      currentElements[element] = newValue;
      elementsChanged = true;
    }
  }
  if (elementsChanged) {
    triggerRef(elements);
  }

  if (turnTime.value !== data.turnTime) turnTime.value = data.turnTime;
  if (gameTime.value !== data.gameTime) gameTime.value = data.gameTime;
  if (mana.value !== data.mana) mana.value = data.mana;
  if (players.value !== data.players) players.value = data.players;
  if (activePlayer.value !== data.activePlayer)
    activePlayer.value = data.activePlayer;
  if (stats.value !== data.stats) stats.value = data.stats;

  let newMaxHp = 100;
  for (let player of data.players) {
    let hp =
      player.characters.reduce((sum, character) => sum + character.hp, 0) /
      player.characters.length;

    if (hp > newMaxHp) {
      newMaxHp = hp;
    }
  }
  if (maxHp.value !== newMaxHp) maxHp.value = newMaxHp;

  if (!popup.value) {
    const popped = getManager().popupPop();
    if (popped) {
      popup.value = { ...popped, out: false };
      window.setTimeout(() => {
        popup.value!.out = true;

        window.setTimeout(() => {
          popup.value = null;
        }, 600);
      }, popup.value.duration || 5000);
    }
  }
};

const handleKick = (player: number) => {
  const server = getServer()!;
  server.kick(server.players[player]);
};

let id = -1;
onMounted(() => (id = window.setInterval(poll, 500)));
onBeforeUnmount(() => window.clearInterval(id));
</script>

<template>
  <div v-if="!!popup" :class="{ popup: true, 'popup--out': popup.out }">
    <p class="title">{{ popup!.title }}</p>
    <p class="meta">{{ popup!.meta }}</p>
  </div>
  <EndGameDialog v-if="stats" :stats="(stats as AccumulatedStat<unknown>[])" />

  <div :class="{ hud: true, 'hud-open': forceOpen }">
    <div class="players">
      <ul>
        <li class="player" v-for="(player, i) in players">
          <span :class="{ name: true, active: activePlayer === player }"
            >{{ player.name }}
            <IconButton
              v-if="getServer() && i > 0 && !!player.connection"
              title="Remove player"
              :onClick="() => handleKick(i)"
              :icon="close"
          /></span>
          <ul
            class="characters"
            :style="{
              '--max-hp': maxHp,
              '--team-size': getManager().teamSize,
            }"
          >
            <li
              v-for="character in player.characters"
              class="hp"
              :style="{
                '--hp': character.hp,
                background: player.color,
              }"
            ></li>
          </ul>
        </li>
      </ul>
    </div>
    <div class="timer socket">
      <span
        :class="{ text: true, timeout: turnTime < 10000 && turnTime > 0 }"
        >{{ Math.ceil(turnTime / 1000) }}</span
      >
    </div>
    <div class="clock socket">
      <span
        :class="{ text: true, timeout: gameTime < 120000 && gameTime > 0 }"
        >{{ numberFormatter.format(gameTime) }}</span
      >
    </div>
    <div class="mana socket">
      <span class="mana-bar" :style="{ '--value': (mana / MAX_MANA) * 100 }" />
      <span class="text">{{ Math.ceil(mana) }}</span>
    </div>
    <div class="elements socket">
      <span
        class="element"
        v-for="(value, element) in elements"
        :style="{
          '--value': value,
        }"
      >
        <img
          :src="ELEMENT_MAP[element]"
          :alt="element"
          :title="element"
          class="background"
        />
        <img
          :src="ELEMENT_MAP[element]"
          :alt="element"
          :title="element"
          class="foreground"
        />
      </span>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.popup {
  position: absolute;
  top: 20vh;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  font-size: 48px;
  background: linear-gradient(180deg, var(--parchment-light), var(--parchment-dark));
  border: 2px solid var(--border-accent);
  padding: 10px;
  width: 50%;
  border-radius: 4px;
  pointer-events: none;
  animation: slide-in 0.5s 1;
  font-family: Eternal;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4), 0 0 0 1px var(--border-accent-faint), 0 0 0 5px rgba(188, 168, 140, 0.4), 0 0 0 6px var(--border-accent-faint);

  &--out {
    animation: slide-out 0.5s 1 forwards;
  }

  .meta {
    font-size: 28px;
  }
}

@keyframes slide-in {
  0% {
    translate: 0 -30vh;
  }
  100% {
    translate: 0 0;
  }
}

@keyframes slide-out {
  0% {
    translate: 0 0;
  }
  100% {
    translate: 0 -30vh;
  }
}

.hud {
  position: absolute;
  bottom: 0;
  left: 0;
  cursor: url("../../assets/pointer.png"), auto;

  display: grid;
  grid-template:
    "hp hp hp"
    "timer clock clock"
    "mana mana mana"
    "elements elements elements";

  padding: 10px;
  gap: 10px;
  margin: 20px;
  background: linear-gradient(180deg, var(--parchment-light), var(--parchment-dark));
  width: 200px;
  border: 2px solid var(--border-accent);
  border-radius: 4px;
  overflow: hidden;
  transition: all 0.5s;
  box-shadow: 0 2px 10px rgba(30, 15, 5, 0.4), inset 0 0 15px rgba(180, 120, 40, 0.08);
  .text {
    display: block;
    margin-bottom: -4px;
  }

  .players {
    grid-area: hp;

    display: grid;
    grid-template-rows: 0fr;
    transition: grid-template-rows 0.3s;

    > ul {
      overflow: hidden;
      grid-row: 1 / span 2;
      display: flex;
      gap: 6px;
      flex-direction: column;
    }

    .player {
      font-family: Eternal;
      font-size: 20px;

      .name.active {
        font-weight: bold;
        color: var(--border-accent);
        text-shadow: 0 0 6px var(--glow-warm);
      }

      .characters {
        display: flex;
        flex-direction: row;
        gap: 6px;
        padding: 5px;
        background: rgba(0, 0, 0, 0.08);
        border-radius: 4px;

        .hp {
          height: 5px;
          background: rgb(42, 60, 255);
          box-shadow: 2px 2px 2px rgba(0, 0, 0, 0.4), 0 0 4px currentColor;
          border-radius: 4px;
          width: calc(
            calc(var(--hp) / var(--max-hp) / var(--team-size) * 100%) - 6px
          );
          transition: width 0.5s;
        }
      }
    }
  }

  &:hover,
  &-open {
    .players {
      grid-template-rows: 1fr;
    }
  }

  .socket {
    background: transparent;
    border-radius: 4px;
    padding: 6px;
    text-align: center;
    font-family: Eternal;
    font-size: 22px;
    box-sizing: border-box;
  }

  .timer {
    grid-area: timer;
    width: 60px;
    padding-top: 10px;
    background-image: linear-gradient(90deg, transparent, var(--border-accent-faint) 20%, var(--border-accent-faint) 80%, transparent);
    background-size: 100% 1px;
    background-repeat: no-repeat;
    background-position: top;
  }

  .clock {
    grid-area: clock;
    width: 130px;
    padding-top: 10px;
    background-image: linear-gradient(90deg, transparent, var(--border-accent-faint) 20%, var(--border-accent-faint) 80%, transparent);
    background-size: 100% 1px;
    background-repeat: no-repeat;
    background-position: top;
  }

  .mana {
    padding-top: 10px;
    background-image: linear-gradient(90deg, transparent, var(--border-accent-faint) 20%, var(--border-accent-faint) 80%, transparent);
    background-size: 100% 1px;
    background-repeat: no-repeat;
    background-position: top;
  }

  .elements {
    grid-area: elements;
    display: flex;
    justify-content: space-around;
    padding-top: 10px;
    background-image: linear-gradient(90deg, transparent, var(--border-accent-faint) 20%, var(--border-accent-faint) 80%, transparent);
    background-size: 100% 1px;
    background-repeat: no-repeat;
    background-position: top;

    .element {
      position: relative;
      height: 36px;
      width: 36px;
      border-radius: 6px;
      background: rgba(0, 0, 0, 0.1);

      img {
        position: absolute;
        top: 2px;
        left: 2px;

        &.background {
          transition: scale 0.2s;

          filter: grayscale(1) opacity(0.2) blur(1px);
          scale: calc(var(--value, 1) * 0.4 + 0.6);
        }

        &.foreground {
          transition: -webkit-filter 0.5s, filter 0.5s, scale 0.2s;

          scale: calc(var(--value, 1) * 0.4 + 0.6);
          filter: opacity(calc(var(--value, 1) - 0.25))
            brightness(calc(var(--pulse, 1) * var(--value, 1)))
            drop-shadow(2px 2px 0px #000);
          animation: pulse calc(var(--value, 1) * 2s) infinite;
        }
      }
    }
  }

  .mana {
    grid-area: mana;
    display: flex;
    align-items: center;
    gap: 10px;

    &-bar {
      display: block;
      width: 100%;
      height: 5px;
      background: linear-gradient(180deg, #4a4238, #564f43);
      border: 1px solid rgba(30, 15, 5, 0.3);
      border-radius: 4px;

      &::after {
        content: "";
        display: block;
        height: 6px;
        width: calc(var(--value, 0) * 1%);
        background: rgb(42, 60, 255);
        filter: brightness(var(--pulse, 1));
        box-shadow: 2px 2px 2px rgba(0, 0, 0, 0.4), 0 0 6px rgba(42, 60, 255, 0.4);
        border-radius: 4px;
        translate: 0 -1px;
        transition: 0.3s width;
        animation: pulse 3s infinite;
      }
    }
  }

  .timeout {
    display: inline-block;
    transform-origin: center;

    animation: 1s flash infinite, 0.5s wiggle infinite;
  }

  @keyframes flash {
    0% {
      color: #000;
    }
    50% {
      color: #dbcbcb;
    }
    100% {
      color: #d42c2c;
    }
  }

  @keyframes wiggle {
    0% {
      transform: rotate(0deg);
    }
    33% {
      transform: rotate(3deg);
    }
    66% {
      transform: rotate(-3deg);
    }
    100% {
      transform: rotate(0deg);
    }
  }
}
</style>
