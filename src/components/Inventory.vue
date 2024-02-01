<script setup lang="ts">
import { SPELLS, Spell } from "../data/spells";
import { Manager } from "../data/network/manager";
import { ref } from "vue";
import { Server } from "../data/network/server";
import { Client } from "../data/network/client";
import { ELEMENT_MAP } from "../graphics/elements";
import { Message, MessageType } from "../data/network/types";

const { isOpen, onClose } = defineProps<{
  isOpen: boolean;
  onClose: () => void;
}>();

const SLOTS = 30;

const previewName = ref(Manager.instance?.selectedSpell?.name);
const previewDescription = ref(Manager.instance?.selectedSpell?.description);
const previewElements = ref(Manager.instance?.selectedSpell?.elements);
const previewCost = ref(Manager.instance?.selectedSpell?.cost || 0);
const previewMultiplier = ref(
  Manager.instance?.selectedSpell?.costMultiplier?.() || 1
);

const handleClick = (spell?: Spell) => {
  if (spell) {
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

  onClose();
};

const onMouseLeave = (event: Event) => {
  previewName.value = Manager.instance.selectedSpell?.name;
  previewDescription.value = Manager.instance.selectedSpell?.description;
  previewElements.value = Manager.instance.selectedSpell?.elements;
  previewCost.value = Manager.instance?.selectedSpell?.cost || 0;
  previewMultiplier.value =
    Manager.instance?.selectedSpell?.costMultiplier?.() || 1;
};

const onMouseEnter = (spell?: Spell) => {
  if (spell) {
    previewName.value = spell.name;
    previewDescription.value = spell.description;
    previewElements.value = spell.elements;
    previewCost.value = spell.cost;
    previewMultiplier.value = spell.costMultiplier?.() || 1;
  }
};
</script>

<template>
  <div class="clip">
    <div :class="{ wrapper: true, isOpen }">
      <div class="inventory" @mouseleave="onMouseLeave">
        <div class="grid">
          <div
            v-for="i in SLOTS"
            :class="{
              slot: true,
              selected: SPELLS[i - 1] === Manager.instance?.selectedSpell,
            }"
            @click="handleClick(SPELLS[i - 1])"
            @mouseenter="onMouseEnter(SPELLS[i - 1])"
          >
            <span v-if="SPELLS[i - 1]" class="placeholder">{{
              SPELLS[i - 1].name.slice(0, 1)
            }}</span>
          </div>
        </div>
        <div class="spell">
          <div class="description-container">
            <span class="name">
              <span>{{ previewName || "-" }}</span>
            </span>
            <span class="description">{{ previewDescription }}</span>
          </div>

          <div class="mana-container">
            <span
              v-if="previewCost"
              :class="{
                cost: true,
                positive: previewMultiplier < 1,
                negative: previewMultiplier > 1,
              }"
              >{{ Math.ceil(previewCost * previewMultiplier) }}</span
            >
            <span class="elements">
              <img
                v-for="element in previewElements"
                :src="ELEMENT_MAP[element]"
                :alt="element"
                :title="element"
              />
            </span>
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
        border: 2px solid var(--primary);
        border-radius: var(--small-radius);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;

        &.selected {
          box-shadow: 0 0 10px inset var(--highlight);
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

    .spell {
      display: flex;
      flex-direction: row;
      justify-content: space-between;
      padding: 6px;
      padding-top: 0;

      .description-container,
      .mana-container {
        display: flex;
        flex-direction: column;
        justify-content: space-evenly;
      }

      .mana-container {
        align-items: center;
      }

      .name {
        font-family: Eternal;
        font-size: 22px;
        color: var(--highlight);
      }

      .description {
        font-size: 12px;
      }

      .elements {
        img {
          width: 16px;
          height: 16px;
        }
      }

      .cost {
        font-family: Eternal;
        font-size: 22px;

        &.positive {
          color: rgb(62, 102, 62);
        }

        &.negative {
          color: rgb(94, 51, 51);
        }
      }
    }
  }
}
</style>
