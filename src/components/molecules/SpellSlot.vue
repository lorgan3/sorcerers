<script setup lang="ts">
import { Spell } from "../../data/spells";
import { Manager } from "../../data/network/manager";
import { ELEMENT_COLOR_MAP } from "../../graphics/elements";
import { Element } from "../../data/spells/types";

const SPRITES_PER_ROW = 5;

const { spell, animated } = defineProps<{
  spell: Spell;
  animated?: boolean;
}>();

const getElementFilter = (element: Element) =>
  `brightness(${
    0.1 + Math.min(1, Manager.instance.getElementValue(element) / 1.3)
  })`;
</script>

<template>
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
      animated,
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
        stroke: ELEMENT_COLOR_MAP[spell.elements[1] || spell.elements[0]],
        filter: getElementFilter(spell.elements[1] || spell.elements[0]),
      }"
      x="2px"
      y="2px"
      width="46px"
      height="46px"
      rx="3px"
      ry="3px"
    ></rect>
  </svg>
</template>

<style lang="scss" scoped>
.spell-icon {
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
    stroke-dashoffset: calc(var(--dash-offset, 0) * var(--stroke-length));
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
</style>
