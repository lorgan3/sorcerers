<script setup lang="ts">
import { SPELLS, Spell } from "../data/spells";
import { Manager } from "../data/network/manager";
import { onBeforeUnmount, onMounted, ref } from "vue";
import { Server } from "../data/network/server";
import { Client } from "../data/network/client";
import { ELEMENT_MAP } from "../graphics/elements";
import { Message, MessageType } from "../data/network/types";

const props = defineProps<{
  isOpen: boolean;
  onClose: () => void;
}>();

const SLOTS = 30;

const previewSpell = ref(Manager.instance?.selectedSpell);
const previewMultiplier = ref(1);

const poll = () => {
  if (props.isOpen) {
    previewMultiplier.value = previewSpell.value?.costMultiplier?.() || 1;
  }
};

let id = -1;
onMounted(() => (id = window.setInterval(poll, 1000)));
onBeforeUnmount(() => window.clearInterval(id));

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

  props.onClose();
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
              <span>{{ previewSpell.name }}</span>
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
