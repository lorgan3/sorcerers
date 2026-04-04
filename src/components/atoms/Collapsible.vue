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
  <div :class="{ card: true, 'card--open': isOpen }">
    <button class="title" @click="isOpen = !isOpen">
      <img class="icon" :src="isOpen ? upIcon : downIcon" />
      <h3>{{ title }}</h3>
    </button>
    <div class="content">
      <div class="content-inner">
        <slot name="default"></slot>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.card {
  background: linear-gradient(180deg, var(--parchment-light), var(--parchment-dark));
  border: 1px solid var(--border-accent-faint);
  border-left: 3px solid var(--border-accent);
  border-radius: 4px;
  overflow: hidden;
}

.title {
  cursor: pointer;
  background: transparent;
  border: none;
  display: flex;
  flex-direction: row;
  align-items: center;
  padding: 6px 10px;
  width: 100%;
  color: var(--border-accent);

  .icon {
    width: 16px;
    height: 16px;
  }
}

.content {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 0.3s;

  .content-inner {
    overflow: hidden;
    padding: 0 10px;
  }
}

.card--open .content {
  grid-template-rows: 1fr;

  .content-inner {
    padding-bottom: 10px;
  }
}
</style>
