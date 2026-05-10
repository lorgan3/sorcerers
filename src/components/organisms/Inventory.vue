<script setup lang="ts">
import { SPELLS, Spell } from "../../data/spells";
import {
  getContextOrNull,
  getLevel,
  getManager,
  getServer,
} from "../../data/context";
import { onBeforeUnmount, onMounted, ref, watch, computed } from "vue";
import { Client } from "../../data/network/client";
import { Message, MessageType } from "../../data/network/types";
import Tooltip from "../atoms/Tooltip.vue";
import SpellDescription from "../molecules/SpellDescription.vue";
import SpellSlot from "../molecules/SpellSlot.vue";
import { Element } from "../../data/spells/types";

const props = defineProps<{
  isOpen: boolean;
  onClose: () => void;
  setInventoryState: (open: boolean) => void;
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

const selectedSpell = ref(getManager()?.selectedSpell);
const availableList = ref<boolean[]>([]);
const cameraDetached = ref(false);
const activeCharacterName = ref<string>("");

let cachedExecutedSpells: Spell[] | null = null;
let cachedExecutedLength = 0;
let cachedExecutedSet: Set<Spell> = new Set();

const poll = () => {
  if (props.isOpen) {
    const mana = getManager().self.mana;
    const currentExecuted = getManager().self.executedSpells;
    if (cachedExecutedSpells !== currentExecuted || cachedExecutedLength !== currentExecuted.length) {
      cachedExecutedSpells = currentExecuted;
      cachedExecutedLength = currentExecuted.length;
      cachedExecutedSet = new Set(currentExecuted);
    }
    let changed = false;

    SPELLS.forEach((spell) => {
      const available =
        (spell.costMultiplier?.() || 1) * spell.cost <= mana &&
        !cachedExecutedSet.has(spell);

      if (availableList.value[spell.iconId] !== available) {
        availableList.value[spell.iconId] = available;
        changed = true;
      }
    });

    if (changed) {
      availableList.value = [...availableList.value];
    }
  } else {
    if (getManager().self === getManager().getActivePlayer()) {
      const newSpell = getManager().selectedSpell;
      if (selectedSpell.value !== newSpell) {
        selectedSpell.value = newSpell;
      }
    }
  }
};

const crystalBallTooltip = computed(() => {
  if (!cameraDetached.value) {
    return "Hold ctrl or middle mouse for free camera";
  }
  return activeCharacterName.value
    ? `Click to refocus on ${activeCharacterName.value}`
    : "Click to refocus the camera";
});

const refreshActiveName = () => {
  activeCharacterName.value =
    getManager().getActivePlayer()?.activeCharacter?.characterName ?? "";
};

let id = -1;
let unsubscribeAttach: (() => void) | null = null;
const trySubscribeCamera = () => {
  if (unsubscribeAttach) return;
  const cameraTarget = getContextOrNull()?.level?.cameraTarget;
  if (!cameraTarget) return;
  cameraDetached.value = cameraTarget.isDetached;
  if (cameraDetached.value) refreshActiveName();
  unsubscribeAttach = cameraTarget.addAttachListener((detached) => {
    cameraDetached.value = detached;
    if (detached) refreshActiveName();
  });
};

onMounted(() => {
  id = window.setInterval(() => {
    poll();
    trySubscribeCamera();
  }, 1000);
  trySubscribeCamera();
});
onBeforeUnmount(() => {
  window.clearInterval(id);
  unsubscribeAttach?.();
});

watch(
  () => props.isOpen,
  () => poll(),
  { immediate: true }
);

const handleClick = (spell?: Spell) => {
  if (spell && !getManager().self.executedSpells.includes(spell)) {
    props.onClose();

    const server = getServer();
    if (server) {
      getManager().selectSpell(spell);

      const message: Message = {
        type: MessageType.SelectSpell,
        spell: SPELLS.indexOf(spell),
        player: server.players.indexOf(server.self),
      };
      server.broadcast(message);
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

const handleRecenter = (event: MouseEvent) => {
  if (!cameraDetached.value) return;

  event.stopPropagation();
  getLevel().cameraTarget.recenter();
};

const getElementFilter = (element: Element) =>
  `brightness(${
    0.1 + Math.min(1, getManager().getElementValue(element) / 1.3)
  })`;
</script>

<template>
  <div class="clip">
    <div class="controls" @mousedown="props.setInventoryState(true)">
      <Tooltip
        direction="center-left"
        :text="crystalBallTooltip"
        width="240px"
      >
        <div
          :class="{ control: true, 'crystal-ball': true, slot: true, scrying: cameraDetached }"
          @mousedown="handleRecenter"
        >
          <img class="glyph glyph-1" src="../../assets/icons/arcane_bright.png" />
          <img class="glyph glyph-2" src="../../assets/icons/elemental_bright.png" />
          <img class="glyph glyph-3" src="../../assets/icons/life_bright.png" />
          <img class="glyph glyph-4" src="../../assets/icons/physical_bright.png" />
        </div>
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
  border: 2px solid var(--border-accent);
  border-radius: 4px;
  background: linear-gradient(180deg, var(--parchment-light), var(--parchment-dark));
  box-shadow: 0 2px 8px rgba(30, 15, 5, 0.3);
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
      position: relative;
      transition: filter 0.3s ease, box-shadow 0.3s ease;

      &.scrying {
        cursor: pointer;
        box-shadow:
          0 0 6px var(--glow-mystic),
          0 0 14px var(--glow-mystic-soft),
          inset 0 0 6px var(--glow-mystic-soft);
        animation: scrying-pulse 1.6s ease-in-out infinite;

        .glyph {
          opacity: 1;
        }
      }

      .glyph {
        position: absolute;
        top: 50%;
        left: 50%;
        width: 16px;
        height: 16px;
        margin: -8px 0 0 -8px;
        pointer-events: none;
        image-rendering: pixelated;
        filter: drop-shadow(0 0 4px var(--glow-mystic));
        opacity: 0;
        transition: opacity 0.3s ease;
        transform-origin: center;
        animation: scrying-orbit 5s linear infinite;
      }

      .glyph-1 { animation-delay: 0s; }
      .glyph-2 { animation-delay: -1.25s; }
      .glyph-3 { animation-delay: -2.5s; }
      .glyph-4 { animation-delay: -3.75s; }
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
  box-shadow: inset 0 0 6px rgba(30, 15, 5, 0.15);
  border: 1px solid transparent;
  transition: background 0.2s ease, box-shadow 0.2s ease;
}

.wrapper {
  transition: transform 0.5s;
  transform: translateX(calc(100% + 2vw));

  &.isOpen {
    transform: translateX(0);
  }

  .inventory {
    border: 2px solid var(--border-accent);
    border-radius: 4px;
    background: linear-gradient(180deg, var(--parchment-light), var(--parchment-dark));
    box-shadow: -4px 0 15px rgba(30, 15, 5, 0.3);
    pointer-events: all;
    cursor: url("../../assets/pointer.png"), auto;

    overflow-y: auto;
    scrollbar-width: none;
    &::-webkit-scrollbar {
      display: none;
    }

    .title {
      color: var(--border-accent);
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
          background: linear-gradient(180deg, var(--parchment-hover-light), var(--parchment-hover-dark));
          box-shadow: inset 0 0 8px var(--glow-warm-soft);
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

@keyframes scrying-pulse {
  0%, 100% { filter: brightness(1.0); }
  50%      { filter: brightness(1.35); }
}

@keyframes scrying-orbit {
  0%   { transform: rotate(0deg)   translateX(28px) rotate(0deg); }
  100% { transform: rotate(360deg) translateX(28px) rotate(-360deg); }
}
</style>
