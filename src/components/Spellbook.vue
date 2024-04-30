<script setup lang="ts">
import { onMounted, ref } from "vue";
import { Element } from "../data/spells/types";
import { SPELLS, Spell } from "../data/spells";
import { ELEMENT_MAP } from "../graphics/elements";

const SPRITES_PER_ROW = 5;
const elements = Object.keys(Element);

const { onBack } = defineProps<{
  onBack: () => void;
}>();

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

onMounted(() => {});
</script>

<template>
  <div className="grid">
    <div class="blocked"></div>
    <div v-for="row in Element" class="element-header">
      <!-- {{ row }} -->

      <img :src="ELEMENT_MAP[row]" :alt="row" :title="row" />
    </div>

    <template v-for="column in Element">
      <div class="element-header">
        <!-- {{ column }} -->

        <img :src="ELEMENT_MAP[column]" :alt="column" :title="column" />
      </div>
      <div
        v-for="element in Element"
        :class="{
          element: true,
          blocked: elements.indexOf(element) > elements.indexOf(column),
        }"
      >
        <div
          v-for="spell in spellsByElement[
            element === column ? element : `${column}-${element}`
          ]"
        >
          <!-- {{ spell.name }} -->

          <div
            :style="{
              '--row': -Math.floor(spell.iconId / SPRITES_PER_ROW),
              '--column': -(spell.iconId % SPRITES_PER_ROW),
            }"
            class="spell-icon"
            :title="spell.name"
          ></div>
        </div>
        <span class="mana-cost">{{
          spellsByElement[
            element === column ? element : `${column}-${element}`
          ]?.reduce((sum, spell) => sum + spell.cost, 0)
        }}</span>
      </div>
    </template>
  </div>

  <div>
    <button @click="onBack" class="secondary">Back</button>
  </div>
</template>

<style lang="scss" scoped>
.grid {
  display: grid;
  grid-template-columns: 46px repeat(4, 1fr);
  border: 1px solid var(--primary);

  & > * {
    padding: 6px;
    border: 1px solid var(--primary);
    position: relative;
  }

  .element-header {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .element {
    display: flex;
    flex-wrap: wrap;
  }

  .blocked {
    background: var(--background-dark);
  }

  .mana-cost {
    position: absolute;
    bottom: 6px;
    right: 6px;
  }

  .spell-icon {
    --size: 96px;

    background: url("../assets/spells.png");
    background-position: left calc(var(--column, 0) * var(--size)) top
      calc(var(--row, 0) * var(--size));
    width: var(--size);
    height: var(--size);
    background-size: calc(var(--size) * 5);
  }
}
</style>
