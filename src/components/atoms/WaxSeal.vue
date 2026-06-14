<script setup lang="ts">
const {
  icon,
  letter,
  size = 40,
} = defineProps<{
  icon?: string;
  letter?: string;
  size?: number;
}>();
</script>

<template>
  <span class="wax-seal" :style="{ '--size': `${size}px` }">
    <svg viewBox="0 0 13 13" shape-rendering="crispEdges" aria-hidden="true">
      <path
        d="M4 0 H9 V1 H11 V2 H12 V4 H13 V9 H12 V11 H11 V12 H9 V13 H4 V12 H2 V11 H1 V9 H0 V4 H1 V2 H2 V1 H4 Z"
        fill="var(--seal-dark)"
      />
      <path d="M4 1 H9 V2 H10 V3 H11 V5 H10 V4 H9 V3 H7 V2 H4 Z" fill="var(--seal-mid)" />
    </svg>
    <img v-if="icon" :src="icon" class="emblem" alt="" />
    <span v-else-if="letter" class="letter">{{ letter }}</span>
  </span>
</template>

<style lang="scss" scoped>
.wax-seal {
  position: relative;
  display: inline-block;
  width: var(--size);
  height: var(--size);

  svg {
    width: 100%;
    height: 100%;
  }

  .emblem {
    position: absolute;
    inset: 25%;
    image-rendering: pixelated;
    filter: brightness(1.6) sepia(0.4);
  }

  .letter {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: Eternal;
    font-size: calc(var(--size) * 0.45);
    color: var(--seal-light);
  }
}
</style>
