<script setup lang="ts">
import { ref } from "vue";
import downIcon from "pixelarticons/svg/chevron-down.svg";
import upIcon from "pixelarticons/svg/chevron-up.svg";

const { title, defaultOpen } = defineProps<{
  title: string;
  defaultOpen?: boolean;
}>();

const slots = defineSlots<{
  default(): any;
}>();

const isOpen = ref(defaultOpen);
</script>

<template>
  <button class="title" @click="isOpen = !isOpen">
    <img class="icon" :src="isOpen ? upIcon : downIcon" />
    <h3>{{ title }}</h3>
  </button>
  <div :class="{ content: true, 'content--open': isOpen }">
    <slot name="default"></slot>
  </div>
</template>

<style lang="scss" scoped>
.title {
  cursor: pointer;
  background: linear-gradient(180deg, var(--parchment-light), var(--parchment-dark));
  border: 1px solid var(--border-accent-faint);
  border-radius: 4px;
  display: flex;
  flex-direction: row;
  align-items: center;
  padding: 4px 8px;
  color: var(--border-accent);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;

  &:hover {
    border-color: var(--border-accent);
    box-shadow: 0 0 6px var(--glow-warm-soft);
  }

  .icon {
    width: 16px;
    height: 16px;
  }
}

.content {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 0.3s;
  margin-left: 16px;

  > * {
    overflow: hidden;
    grid-row: 1 / span 2;
  }

  &--open {
    grid-template-rows: 1fr;
  }
}
</style>
