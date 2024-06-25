<script setup lang="ts">
const { onClick, icon, hoverIcon, title } = defineProps<{
  onClick: (event: Event) => void;
  icon: string;
  hoverIcon?: string;
  title?: string;
}>();
</script>

<template>
  <button class="icon-button" :title="title" @click="onClick">
    <img class="icon" :src="icon" />
    <img v-if="hoverIcon" class="icon icon--hover" :src="hoverIcon" />
  </button>
</template>

<style lang="scss" scoped>
.icon-button {
  background: none;
  border: none;
  margin: -4px 0;
  padding: 0;
  cursor: pointer;
  font-size: 18px;
  vertical-align: middle;
  border-radius: var(--big-radius);
  display: inline-flex;
  padding: 3px;
  transition: 0.2s background-color;

  .icon {
    width: 16px;
    height: 16px;

    &--hover {
      display: none;
    }
  }

  &:focus-visible {
    outline: none;
    border: 4px solid var(--primary);
  }

  &:hover {
    background-color: var(--background-dark);

    .icon {
      &:not(:only-child) {
        display: none;
      }

      &--hover {
        display: block !important;
      }
    }
  }
}
</style>
