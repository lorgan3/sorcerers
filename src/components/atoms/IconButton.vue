<script setup lang="ts">
const { onClick, icon, hoverIcon, title, className } = defineProps<{
  onClick: (event: Event) => void;
  icon: string;
  hoverIcon?: string;
  title?: string;
  className?: string;
}>();
</script>

<template>
  <button
    :class="{ 'icon-button': true, [className || '']: !!className }"
    :title="title"
    @click="onClick"
  >
    <img class="icon" :src="icon" />
    <img v-if="hoverIcon" class="icon icon--hover" :src="hoverIcon" />
  </button>
</template>

<style lang="scss" scoped>
.icon-button {
  background: transparent;
  border: 1px solid transparent;
  margin: -4px 0;
  cursor: pointer;
  font-size: 18px;
  vertical-align: middle;
  border-radius: 3px;
  display: inline-flex;
  padding: 4px;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;

  .icon {
    width: 16px;
    height: 16px;

    &--hover {
      display: none;
    }
  }

  &:focus-visible {
    outline: none;
    border-color: var(--border-accent);
    box-shadow: 0 0 6px var(--glow-warm-soft);
  }

  &:hover {
    border-color: var(--border-accent);
    box-shadow: 0 0 8px var(--glow-warm-soft);
    background: linear-gradient(180deg, var(--parchment-hover-light), var(--parchment-hover-dark));

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
