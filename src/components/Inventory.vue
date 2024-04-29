<script setup lang="ts">
import { SPELLS, Spell } from "../data/spells";
import { Manager } from "../data/network/manager";
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import { Server } from "../data/network/server";
import { Client } from "../data/network/client";
import { ELEMENT_MAP, ELEMENT_COLOR_MAP } from "../graphics/elements";
import { Message, MessageType } from "../data/network/types";
import { Element } from "../data/spells/types";

const props = defineProps<{
  isOpen: boolean;
  onClose: () => void;
}>();

const SLOTS = 30;

const previewSpell = ref(Manager.instance?.selectedSpell);
const previewMultiplier = ref(1);
const availableList = ref<boolean[]>([]);

const poll = () => {
  if (props.isOpen) {
    previewMultiplier.value = previewSpell.value?.costMultiplier?.() || 1;

    const mana = Manager.instance.self.mana;
    availableList.value = SPELLS.map(
      (spell) =>
        (spell.costMultiplier?.() || 1) * spell.cost <= mana &&
        !Manager.instance.self.executedSpells.includes(spell)
    );
  }
};

let id = -1;
onMounted(() => (id = window.setInterval(poll, 1000)));
onBeforeUnmount(() => window.clearInterval(id));

watch(
  () => props.isOpen,
  () => poll(),
  { immediate: true }
);

const handleClick = (spell?: Spell) => {
  if (spell && !Manager.instance.self.executedSpells.includes(spell)) {
    props.onClose();

    if (Server.instance) {
      Manager.instance.selectSpell(spell);

      const message: Message = {
        type: MessageType.SelectSpell,
        spell: SPELLS.indexOf(spell),
        player: Server.instance.players.indexOf(Server.instance.self),
      };
      Server.instance.broadcast(message);
    }

    if (Client.instance) {
      const message: Message = {
        type: MessageType.SelectSpell,
        spell: SPELLS.indexOf(spell),
      };
      Client.instance.broadcast(message);
    }
  }
};

const onMouseLeave = (event: Event) => {
  previewSpell.value = Manager.instance.selectedSpell;

  previewMultiplier.value =
    Manager.instance?.selectedSpell?.costMultiplier?.() || 1;
};

const onMouseEnter = (spell?: Spell) => {
  if (spell) {
    previewSpell.value = spell;
    previewMultiplier.value = spell.costMultiplier?.() || 1;
  }
};

const getElementFilter = (element: Element) =>
  `brightness(${
    0.1 + Math.min(1, Manager.instance.getElementValue(element) / 1.3)
  })`;
</script>

<template>
  <div class="clip">
    <div :class="{ wrapper: true, isOpen: props.isOpen }">
      <div class="inventory" @mouseleave="onMouseLeave">
        <div class="grid">
          <div
            v-for="i in SLOTS"
            :class="{
              slot: true,
              locked: !availableList[i - 1],
            }"
            @click="handleClick(SPELLS[i - 1])"
            @mouseenter="onMouseEnter(SPELLS[i - 1])"
          >
            <span v-if="SPELLS[i - 1]" class="placeholder">{{
              SPELLS[i - 1].name.slice(0, 1)
            }}</span>
            <svg
              width="50px"
              height="50px"
              :class="{
                border: true,
                animated: SPELLS[i - 1] === Manager.instance?.selectedSpell,
              }"
              v-if="SPELLS[i - 1]"
            >
              <rect
                :style="{
                  '--dash-offset': 0,
                  stroke: ELEMENT_COLOR_MAP[SPELLS[i - 1].elements[0]],
                  filter: getElementFilter(SPELLS[i - 1].elements[0]),
                }"
                x="2px"
                y="2px"
                width="46px"
                height="46px"
                rx="3px"
                ry="3px"
              ></rect>
              <rect
                :style="{
                  '--dash-offset': 1,
                  stroke:
                    ELEMENT_COLOR_MAP[
                      SPELLS[i - 1].elements[1] || SPELLS[i - 1].elements[0]
                    ],
                  filter: getElementFilter(
                    SPELLS[i - 1].elements[1] || SPELLS[i - 1].elements[0]
                  ),
                }"
                x="2px"
                y="2px"
                width="46px"
                height="46px"
                rx="3px"
                ry="3px"
              ></rect>
            </svg>
          </div>
        </div>
        <div v-if="previewSpell" class="spell">
          <div class="magic">
            <span
              v-if="previewSpell.cost"
              :class="{
                cost: true,
                positive: previewMultiplier < 1,
                negative: previewMultiplier > 1,
              }"
              >{{ Math.ceil(previewSpell.cost * previewMultiplier) }}</span
            >
            <span class="elements">
              <img
                v-for="element in previewSpell.elements"
                :src="ELEMENT_MAP[element]"
                :alt="element"
                :title="element"
              />
            </span>
          </div>
          <div class="details">
            <span class="name">
              <span
                >{{ previewSpell.name }}
                <span v-if="previewSpell.stacking">⟳</span></span
              >
            </span>
            <span class="description">{{ previewSpell.description }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.clip {
  position: absolute;
  right: 2vw;
  bottom: 10vh;
  top: 10vh;
  display: flex;
  flex-direction: column;
  justify-content: end;
  pointer-events: none;

  overflow: clip;
  overflow-clip-margin: 2vw;
}

.wrapper {
  transition: transform 0.5s;
  transform: translateX(calc(100% + 2vw));

  &.isOpen {
    transform: translateX(0);
  }

  .inventory {
    border: 4px solid var(--primary);
    border-radius: var(--small-radius);
    background: var(--background);
    pointer-events: all;
    cursor: url("../assets/pointer.png"), auto;

    overflow-y: auto;
    scrollbar-width: none;
    &::-webkit-scrollbar {
      display: none;
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(5, 50px);
      grid-template-rows: repeat(6, 50px);
      gap: 3px;
      padding: 6px;

      .slot {
        border-radius: var(--small-radius);
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
        box-shadow: 0 0 10px -2px inset var(--highlight);

        &.locked {
          opacity: 0.5;
        }

        &:hover {
          background-color: var(--background-dark);
        }

        .placeholder {
          color: var(--highlight);
          font-family: "Eternal";
          font-size: 42px;
          margin-top: 6px;
        }

        .border {
          position: absolute;

          rect {
            fill: none;
            stroke: #000;
            stroke-width: 3px;
            stroke-dasharray: var(--stroke-length), var(--stroke-length);
            stroke-dashoffset: calc(
              var(--dash-offset, 0) * var(--stroke-length)
            );
          }

          &.animated {
            rect {
              --stroke-length: calc(43.425px * 2);
              stroke-dasharray: calc(var(--stroke-length) / 2),
                calc(var(--stroke-length) * 3 / 2);
              animation: rotateBorder 2s linear infinite;
            }
          }
        }
      }
    }

    .spell {
      display: flex;
      flex-direction: row;
      align-items: center;
      padding: 6px;
      padding-top: 0;
      gap: 6px;
      word-wrap: break-word;

      .magic {
        display: flex;
        flex-direction: row;
        align-items: center;
        background: var(--background-dark);
        padding: 3px 0;
        border-radius: var(--big-radius);
        height: 38px;
        gap: 6px;
        width: 60px;
        justify-content: space-evenly;
      }

      .elements {
        display: flex;
        flex-direction: column;

        img {
          width: 16px;
          height: 16px;
        }
      }

      .cost {
        font-family: Eternal;
        font-size: 36px;
        margin-bottom: -4px;
        animation: pulse 3s infinite;
        color: rgb(42, 60, 255);
        filter: brightness(var(--pulse, 1));
        text-shadow: 1px 1px 1px black;

        &.positive {
          color: rgb(62, 102, 62);
        }

        &.negative {
          color: rgb(94, 51, 51);
        }
      }

      .details {
        display: flex;
        flex-direction: column;
        width: 0;

        flex: 1;

        .name {
          font-family: Eternal;
          font-size: 22px;
          color: var(--highlight);
        }

        .description {
          font-size: 12px;
        }
      }
    }
  }
}
</style>
