<script setup lang="ts">
import { SPELLS, Spell } from "../../data/spells";
import { Manager } from "../../data/network/manager";
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import { Server } from "../../data/network/server";
import { Client } from "../../data/network/client";
import { ELEMENT_COLOR_MAP } from "../../graphics/elements";
import { Message, MessageType } from "../../data/network/types";
import { Element } from "../../data/spells/types";
import Tooltip from "../atoms/Tooltip.vue";
import SpellDescription from "../molecules/SpellDescription.vue";

const props = defineProps<{
  isOpen: boolean;
  onClose: () => void;
}>();

const { offenseSpells, supportSpells } = SPELLS.reduce(
  (groups, spell) => {
    groups[spell.stacking ? "supportSpells" : "offenseSpells"].push(spell);
    return groups;
  },
  { offenseSpells: [] as Spell[], supportSpells: [] as Spell[] }
);

const sections = {
  "Support ⟳": supportSpells,
  Offense: offenseSpells,
};

const SPRITES_PER_ROW = 5;

const previewSpell = ref(Manager.instance?.selectedSpell);
const previewMultiplier = ref(1);
const availableList = ref<boolean[]>([]);

const poll = () => {
  if (props.isOpen) {
    previewMultiplier.value = previewSpell.value?.costMultiplier?.() || 1;

    const mana = Manager.instance.self.mana;
    availableList.value = [];
    SPELLS.forEach((spell) => {
      availableList.value[spell.iconId] =
        (spell.costMultiplier?.() || 1) * spell.cost <= mana &&
        !Manager.instance.self.executedSpells.includes(spell);
    });
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
        <template v-for="(spells, title) in sections">
          <p class="title">{{ title }}</p>
          <div class="grid">
            <Tooltip v-for="spell in spells" direction="center-left">
              <template v-slot:tooltip>
                <SpellDescription :spell="spell"
              /></template>
              <div
                :class="{
                  slot: true,
                  locked: !availableList[spell.iconId],
                }"
                @click="handleClick(spell)"
                @mouseenter="onMouseEnter(spell)"
              >
                <div
                  :style="{
                    '--row': -Math.floor(spell.iconId / SPRITES_PER_ROW),
                    '--column': -(spell.iconId % SPRITES_PER_ROW),
                  }"
                  class="spell-icon"
                ></div>
                <svg
                  width="50px"
                  height="50px"
                  :class="{
                    border: true,
                    animated: spell === Manager.instance?.selectedSpell,
                  }"
                >
                  <rect
                    :style="{
                      '--dash-offset': 0,
                      stroke: ELEMENT_COLOR_MAP[spell.elements[0]],
                      filter: getElementFilter(spell.elements[0]),
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
                          spell.elements[1] || spell.elements[0]
                        ],
                      filter: getElementFilter(
                        spell.elements[1] || spell.elements[0]
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
            </Tooltip>
          </div>
        </template>
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
    cursor: url("../../assets/pointer.png"), auto;

    overflow-y: auto;
    scrollbar-width: none;
    &::-webkit-scrollbar {
      display: none;
    }

    .title {
      color: var(--highlight);
      font-family: Eternal;
      font-size: 24px;
      padding: 6px;
      padding-bottom: 0;
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(4, 50px);
      gap: 3px;
      padding: 6px;
      padding-top: 0;

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

        .spell-icon {
          --size: 48px;

          background: url("../../assets/spells.png");
          background-position: left calc(var(--column, 0) * var(--size)) top
            calc(var(--row, 0) * var(--size));
          width: var(--size);
          height: var(--size);
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
  }
}
</style>
