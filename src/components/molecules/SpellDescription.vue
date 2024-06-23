<script setup lang="ts">
import { ref, watch } from "vue";
import { Spell } from "../../data/spells";
import { ELEMENT_MAP } from "../../graphics/elements";

const { spell } = defineProps<{ spell: Spell }>();
const previewMultiplier = ref(1);
watch(
  () => spell,
  () =>
    (previewMultiplier.value = spell.costMultiplier
      ? spell.costMultiplier()
      : 1),
  { immediate: true }
);
</script>

<template>
  <div class="spell">
    <div class="magic">
      <span
        v-if="spell.cost"
        :class="{
          cost: true,
          positive: previewMultiplier < 1,
          negative: previewMultiplier > 1,
        }"
        >{{ Math.ceil(spell.cost * previewMultiplier) }}</span
      >
      <span class="elements">
        <img
          v-for="element in spell.elements"
          :src="ELEMENT_MAP[element]"
          :alt="element"
          :title="element"
        />
      </span>
    </div>
    <div class="details">
      <span class="name">
        <span>{{ spell.name }} </span>
      </span>
      <span class="description">{{ spell.description }}</span>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.spell {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 6px;
  padding: 6px;
  width: 250px;

  .magic {
    display: flex;
    flex-direction: row;
    align-items: center;
    padding: 3px 0;
    height: 38px;
    gap: 6px;
    width: 60px;
    justify-content: space-evenly;
  }

  .elements {
    display: flex;
    flex-direction: column;
    background: var(--background);
    padding: 3px;
    border-radius: var(--small-radius);

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
      color: rgb(73, 87, 245);
    }

    .description {
      font-size: 12px;
    }
  }
}
</style>
