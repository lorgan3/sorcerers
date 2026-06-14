<script setup lang="ts">
const { label, vertical = false } = defineProps<{
  label?: string;
  vertical?: boolean;
}>();
</script>

<template>
  <div
    class="pixel-divider"
    :class="{ 'pixel-divider--vertical': vertical }"
    role="separator"
  >
    <span class="line" />
    <svg class="diamond" viewBox="0 0 7 7" shape-rendering="crispEdges" aria-hidden="true">
      <path
        d="M3 0 H4 V1 H5 V2 H6 V3 H7 V4 H6 V5 H5 V6 H4 V7 H3 V6 H2 V5 H1 V4 H0 V3 H1 V2 H2 V1 H3 Z"
        fill="currentColor"
      />
    </svg>
    <span v-if="label" class="label">{{ label }}</span>
    <svg
      v-if="label"
      class="diamond"
      viewBox="0 0 7 7"
      shape-rendering="crispEdges"
      aria-hidden="true"
    >
      <path
        d="M3 0 H4 V1 H5 V2 H6 V3 H7 V4 H6 V5 H5 V6 H4 V7 H3 V6 H2 V5 H1 V4 H0 V3 H1 V2 H2 V1 H3 Z"
        fill="currentColor"
      />
    </svg>
    <span class="line" />
  </div>
</template>

<style lang="scss" scoped>
@use "../../style/ornaments" as o;

.pixel-divider {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  color: var(--border-accent);

  .line {
    @include o.stitched-line;
    flex: 1;
  }

  .diamond {
    width: 14px;
    height: 14px;
    flex-shrink: 0;
  }

  .label {
    font-family: Eternal;
    font-size: 28px;
  }
}

.pixel-divider--vertical {
  flex-direction: column;
  width: auto;
  align-self: stretch;

  .line {
    width: 2px;
    height: auto;
    background: repeating-linear-gradient(
      180deg,
      var(--border-accent) 0 4px,
      transparent 4px 8px
    );
  }
}
</style>
