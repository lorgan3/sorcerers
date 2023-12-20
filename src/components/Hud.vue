<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import { Manager } from "./../data/network/manager";
import { Player } from "./../data/network/player";
import { Popup } from "../data/network/types";

interface ActivePopup extends Popup {
  out: boolean;
}

const numberFormatter = new Intl.DateTimeFormat("en-GB", {
  minute: "2-digit",
  second: "2-digit",
});

const windSpeed = ref(0);
const turnTime = ref(0);
const gameTime = ref(0);
const players = ref<Player[]>([]);
const activePlayer = ref<Player | null>(null);
const popup = ref<ActivePopup | null>(null);

const poll = () => {
  if (!Manager.instance) {
    return;
  }

  const data = Manager.instance.getHudData();
  windSpeed.value = data.windSpeed;
  turnTime.value = data.turnTime;
  gameTime.value = data.gameTime;
  players.value = data.players;
  activePlayer.value = data.activePlayer;

  if (!popup.value) {
    const popped = Manager.instance.popupPop();
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

let id = -1;
onMounted(() => (id = window.setInterval(poll, 500)));
onBeforeUnmount(() => window.clearInterval(id));
</script>

<template>
  <div v-if="!!popup" :class="{ popup: true, 'popup--out': popup.out }">
    <p class="title">{{ popup!.title }}</p>
    <p class="meta">{{ popup!.meta }}</p>
  </div>

  <div class="hud">
    <div class="players">
      <ul>
        <li class="player" v-for="player in players">
          <span :class="{ name: true, active: activePlayer === player }">{{
            player.name
          }}</span>
          <ul class="characters">
            <li v-for="character in player.characters">
              <div
                class="hp"
                :style="{
                  width: `${Math.max(0, Math.ceil(character.hp / 3))}px`,
                }"
              ></div>
            </li>
          </ul>
        </li>
      </ul>
    </div>
    <div class="timer socket">
      <span :class="{ timeout: turnTime < 10000 && turnTime > 0 }">{{
        Math.ceil(turnTime / 1000)
      }}</span>
    </div>
    <div class="clock socket">
      <span :class="{ timeout: gameTime < 120000 && gameTime > 0 }">{{
        numberFormatter.format(gameTime)
      }}</span>
    </div>
    <div class="wind socket" :key="windSpeed">
      <span
        v-for="i in Math.abs(windSpeed)"
        :class="{ arrow: true, left: windSpeed < 0 }"
        :style="{ '--wind-index': i * Math.sign(windSpeed) }"
      >
        ➤
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
  background: #b5a78a;
  border: 4px solid #433e34;
  padding: 10px;
  width: 50%;
  border-radius: 8px;
  pointer-events: none;
  animation: slide-in 0.5s 1;
  font-family: Eternal;

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

  display: grid;
  grid-template:
    "hp hp hp"
    "timer clock clock"
    "wind wind wind";

  padding: 10px;
  gap: 10px;
  margin: 20px;
  background: #b5a78a;
  width: 200px;
  border: 4px solid #433e34;
  border-radius: 8px;
  overflow: hidden;
  transition: all 0.5s;

  &:hover {
    .players {
      grid-template-rows: 1fr;
    }
  }

  .players {
    grid-area: hp;

    display: grid;
    grid-template-rows: 0fr;
    transition: grid-template-rows 0.3s;

    ul {
      overflow: hidden;
      grid-row: 1 / span 2;
      display: flex;
      gap: 6px;
      flex-direction: column;
    }

    .player {
      font-family: Eternal;

      .name.active {
        font-weight: bold;
      }

      .characters {
        display: flex;
        flex-direction: row;
        gap: 6px;
        padding: 5px;
        background: #9c917b;
        border-radius: 8px;

        .hp {
          height: 5px;
          background: rgb(42, 60, 255);
          border-radius: 4px;
        }
      }
    }
  }

  .socket {
    background: #9c917b;
    border-radius: 8px;
    padding: 6px;
    text-align: center;
    min-height: 22px;
    font-family: Eternal;
    font-size: 22px;
  }

  .timer {
    grid-area: timer;
  }

  .clock {
    grid-area: clock;
  }

  .wind {
    grid-area: wind;

    .left {
      scale: -1 1;
    }

    .arrow {
      animation: 1.2s grow infinite;
      animation-delay: calc(0.1s * var(--wind-index));
      display: inline-block;
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

  @keyframes grow {
    0% {
      transform: scale(0.5);
    }
    20% {
      transform: scale(0.5);
    }
    50% {
      transform: scale(1);
    }
    80% {
      transform: scale(0.5);
    }
    100% {
      transform: scale(0.5);
    }
  }
}
</style>
