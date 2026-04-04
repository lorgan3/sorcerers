<script setup lang="ts">
import { Element } from "../../data/spells/types";
import { SPELLS, Spell } from "../../data/spells";
import { ELEMENT_MAP, ELEMENT_COLOR_MAP } from "../../graphics/elements";
import { RouterLink } from "vue-router";
import Tooltip from "../atoms/Tooltip.vue";
import SpellDescription from "../molecules/SpellDescription.vue";

const SPRITES_PER_ROW = 5;
const elements = Object.keys(Element);

const spellsByElement = SPELLS.reduce((all, spell) => {
  const key = spell.elements
    .sort((a, b) => elements.indexOf(b) - elements.indexOf(a))
    .join("-");

  if (!all[key]) {
    all[key] = [];
  }

  all[key].push(spell);
  return all;
}, {} as Record<string, Spell[]>);
</script>

<template>
  <div class="grid">
    <div class="corner-cell"></div>
    <div
      v-for="row in Element"
      class="element-header element-header--col"
      :style="{ '--el-color': ELEMENT_COLOR_MAP[row] }"
    >
      <img :src="ELEMENT_MAP[row]" :alt="row" :title="row" />
    </div>

    <template v-for="column in Element">
      <div
        class="element-header element-header--row"
        :style="{ '--el-color': ELEMENT_COLOR_MAP[column] }"
      >
        <img :src="ELEMENT_MAP[column]" :alt="column" :title="column" />
      </div>
      <div
        v-for="element in Element"
        :class="{
          cell: true,
          blocked: elements.indexOf(element) > elements.indexOf(column),
        }"
        :style="{
          '--col-color': ELEMENT_COLOR_MAP[element],
          '--row-color': ELEMENT_COLOR_MAP[column],
        }"
      >
        <template
          v-if="elements.indexOf(element) <= elements.indexOf(column)"
        >
          <div
            v-for="spell in spellsByElement[
              element === column ? element : `${column}-${element}`
            ]"
            class="spell-slot"
          >
            <Tooltip direction="top-center">
              <template v-slot:tooltip>
                <SpellDescription :spell="spell" />
              </template>
              <div
                :style="{
                  '--row': -Math.floor(spell.iconId / SPRITES_PER_ROW),
                  '--column': -(spell.iconId % SPRITES_PER_ROW),
                }"
                class="spell-icon"
              ></div>
            </Tooltip>
          </div>
          <span
            v-if="spellsByElement[element === column ? element : `${column}-${element}`]"
            class="mana-cost"
          >
            {{
              spellsByElement[
                element === column ? element : `${column}-${element}`
              ]?.reduce((sum, spell) => sum + spell.cost, 0)
            }}
          </span>
        </template>
      </div>
    </template>
  </div>

  <div>
    <RouterLink to="/" v-slot="{ navigate }">
      <button @click="navigate" class="secondary">Back</button>
    </RouterLink>
  </div>
</template>

<style lang="scss" scoped>
.grid {
  display: grid;
  grid-template-columns: 54px repeat(4, 1fr);
  gap: 2px;
  background: var(--border-accent-faint);
  border: 2px solid var(--border-accent);
  border-radius: 4px;
  overflow: hidden;
}

.corner-cell {
  background: linear-gradient(135deg, var(--parchment-dark), var(--background-dark));
}

.element-header {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px;
  background: linear-gradient(
    180deg,
    color-mix(in srgb, var(--el-color) 12%, var(--parchment-light)),
    color-mix(in srgb, var(--el-color) 8%, var(--parchment-dark))
  );
  position: relative;

  img {
    width: 32px;
    height: 32px;
    filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.2));
  }

  &--col::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 20%;
    right: 20%;
    height: 2px;
    background: var(--el-color);
    opacity: 0.3;
    border-radius: 1px;
  }

  &--row::after {
    content: '';
    position: absolute;
    right: 0;
    top: 20%;
    bottom: 20%;
    width: 2px;
    background: var(--el-color);
    opacity: 0.3;
    border-radius: 1px;
  }
}

.cell {
  display: flex;
  flex-wrap: wrap;
  align-content: flex-start;
  padding: 6px;
  position: relative;
  background: linear-gradient(
    180deg,
    var(--parchment-light),
    var(--parchment-dark)
  );
  border-left: 2px solid color-mix(in srgb, var(--row-color) 25%, transparent);
  border-top: 2px solid color-mix(in srgb, var(--col-color) 25%, transparent);
  transition: box-shadow 0.2s ease;
  min-height: 60px;

  &:hover:not(.blocked) {
    box-shadow:
      inset 0 0 15px color-mix(in srgb, var(--row-color) 10%, transparent),
      inset 0 0 15px color-mix(in srgb, var(--col-color) 10%, transparent);
  }

  &.blocked {
    background:
      repeating-linear-gradient(
        45deg,
        transparent,
        transparent 8px,
        rgba(64, 32, 32, 0.04) 8px,
        rgba(64, 32, 32, 0.04) 16px
      ),
      linear-gradient(180deg, var(--background-dark), #978467);
    border-color: transparent;
  }
}

.spell-slot {
  position: relative;
}

.spell-icon {
  --size: 96px;

  background: url("../../assets/spells.png");
  background-position: left calc(var(--column, 0) * var(--size)) top
    calc(var(--row, 0) * var(--size));
  width: var(--size);
  height: var(--size);
  background-size: calc(var(--size) * 5);
  border-radius: 4px;
  transition: transform 0.2s ease, filter 0.2s ease;
  filter: drop-shadow(0 1px 3px rgba(0, 0, 0, 0.2));

  &:hover {
    transform: scale(1.08);
    filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.3)) brightness(1.1);
  }
}

.mana-cost {
  position: absolute;
  bottom: 4px;
  right: 6px;
  font-family: Eternal;
  font-size: 16px;
  color: var(--border-accent);
  background: linear-gradient(180deg, var(--parchment-light), var(--parchment-dark));
  border: 1px solid var(--border-accent-faint);
  border-radius: 3px;
  padding: 1px 6px;
  box-shadow: 0 1px 2px rgba(30, 15, 5, 0.2);
}
</style>
