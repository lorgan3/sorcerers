<script setup lang="ts">
const {
  density = "heavy",
  tear = "a",
  title,
} = defineProps<{
  density?: "heavy" | "light";
  tear?: "a" | "b";
  title?: string;
}>();
</script>

<template>
  <div :class="['torn-wrap', `torn-wrap--${density}`]">
    <div :class="['torn', `torn--${density === 'light' ? 'light' : tear}`]">
      <div v-if="title" class="title-plate">{{ title }}</div>
      <div class="content">
        <template v-if="density === 'heavy'">
          <svg
            class="corner corner--tl"
            viewBox="0 0 10 10"
            shape-rendering="crispEdges"
            aria-hidden="true"
          >
            <path d="M0 10 V2 H1 V1 H2 V0 H10 V1 H3 V2 H2 V3 H1 V10 Z" fill="currentColor" />
            <rect x="2" y="2" width="2" height="2" fill="currentColor" />
            <rect x="5" y="1" width="1" height="1" fill="currentColor" />
            <rect x="1" y="5" width="1" height="1" fill="currentColor" />
          </svg>
          <svg
            class="corner corner--br"
            viewBox="0 0 10 10"
            shape-rendering="crispEdges"
            aria-hidden="true"
          >
            <path d="M0 10 V2 H1 V1 H2 V0 H10 V1 H3 V2 H2 V3 H1 V10 Z" fill="currentColor" />
            <rect x="2" y="2" width="2" height="2" fill="currentColor" />
            <rect x="5" y="1" width="1" height="1" fill="currentColor" />
            <rect x="1" y="5" width="1" height="1" fill="currentColor" />
          </svg>
        </template>
        <slot />
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use "../../style/ornaments" as o;

.torn-wrap--heavy {
  filter: drop-shadow(3px 4px 0 var(--shadow-hard));
}

.torn-wrap--light {
  filter: drop-shadow(2px 2px 0 var(--shadow-hard));
}

.torn {
  @include o.dither-surface;
  position: relative;
  box-sizing: border-box;

  &--a {
    @include o.tear(o.$tear-heavy-a);
  }

  &--b {
    @include o.tear(o.$tear-heavy-b);
  }

  &--light {
    @include o.tear(o.$tear-light);
  }
}

.torn-wrap--heavy .torn {
  padding: calc(var(--tear-depth-heavy) + 10px);

  .content {
    @include o.pixel-frame;
    position: relative;
    padding: 16px 20px;
  }
}

.torn-wrap--light .torn {
  padding: calc(var(--tear-depth-light) + 6px);
}

.corner {
  position: absolute;
  width: 28px;
  height: 28px;
  color: var(--border-accent);

  &--tl {
    top: -2px;
    left: -2px;
  }

  &--br {
    bottom: -2px;
    right: -2px;
    rotate: 180deg;
  }
}

.title-plate {
  position: absolute;
  top: 2px;
  left: 50%;
  translate: -50% 0;
  z-index: 1;
  font-family: Eternal;
  font-size: 26px;
  color: var(--border-accent);
  padding: 0 14px;
  white-space: nowrap;
}
</style>
