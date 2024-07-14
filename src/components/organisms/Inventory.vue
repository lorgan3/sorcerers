<script setup lang="ts">
import { SPELLS, Spell } from "../../data/spells";
import { Manager } from "../../data/network/manager";
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import { Server } from "../../data/network/server";
import { Client } from "../../data/network/client";
import { Message, MessageType } from "../../data/network/types";
import Tooltip from "../atoms/Tooltip.vue";
import SpellDescription from "../molecules/SpellDescription.vue";
import SpellSlot from "../molecules/SpellSlot.vue";
import { Element } from "../../data/spells/types";

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

const selectedSpell = ref(Manager.instance?.selectedSpell);
const availableList = ref<boolean[]>([]);

const poll = () => {
  if (props.isOpen) {
    const mana = Manager.instance.self.mana;
    availableList.value = [];
    SPELLS.forEach((spell) => {
      availableList.value[spell.iconId] =
        (spell.costMultiplier?.() || 1) * spell.cost <= mana &&
        !Manager.instance.self.executedSpells.includes(spell);
    });
  } else {
    if (Manager.instance.self === Manager.instance.getActivePlayer()) {
      selectedSpell.value = Manager.instance.selectedSpell;
    }
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

    selectedSpell.value = spell;
  }
};

const getElementFilter = (element: Element) =>
  `brightness(${
    0.1 + Math.min(1, Manager.instance.getElementValue(element) / 1.3)
  })`;
</script>

<template>
  <div class="clip">
    <div class="controls">
      <Tooltip
        direction="center-left"
        text="Hold ctrl or middle mouse for free camera"
        width="240px"
      >
        <div class="control crystal-ball slot"></div>
      </Tooltip>
      <Tooltip
        v-if="!selectedSpell"
        direction="center-left"
        text="Right click to open spell book"
        width="240px"
      >
        <div class="control spell-book slot"></div>
      </Tooltip>
      <Tooltip v-else direction="center-left">
        <template v-slot:tooltip>
          <SpellDescription :spell="selectedSpell"
        /></template>
        <div
          :class="{
            slot: true,
            locked: !availableList[selectedSpell.iconId],
          }"
        >
          <SpellSlot
            :spell="selectedSpell"
            :element1Filter="getElementFilter(selectedSpell.elements[0])"
            :element2Filter="
              getElementFilter(
                selectedSpell.elements[1] || selectedSpell.elements[0]
              )
            "
          />
        </div>
      </Tooltip>
    </div>
    <div :class="{ wrapper: true, isOpen: props.isOpen }">
      <div class="inventory">
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
              >
                <SpellSlot
                  :spell="spell"
                  :animated="spell === selectedSpell"
                  :element1Filter="getElementFilter(spell.elements[0])"
                  :element2Filter="
                    getElementFilter(spell.elements[1] || spell.elements[0])
                  "
                />
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
  --size: 48px;

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

.controls {
  position: absolute;
  right: 0;
  bottom: 259px;
  display: flex;
  flex-direction: column;
  gap: 3px;
  border: 4px solid var(--primary);
  border-radius: var(--small-radius);
  background: var(--background);
  pointer-events: all;
  cursor: url("../../assets/pointer.png"), auto;
  padding: 6px;

  .control {
    width: var(--size);
    height: var(--size);
    background-repeat: no-repeat;
    background-size: cover;
    image-rendering: pixelated;

    &.crystal-ball {
      background-image: url("../../assets/icons/crystal_ball.png");
    }

    &.spell-book {
      background-image: url("../../assets/icons/spell_book.png");
    }
  }
}

.slot {
  border-radius: var(--small-radius);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  box-shadow: 0 0 10px -2px inset var(--highlight);
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
      }
    }
  }
}
</style>
