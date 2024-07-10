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
  background: transparent;
  border: none;
  display: flex;
  flex-direction: row;
  align-items: center;
  padding: 0;

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
