<script setup lang="ts">
import { computed, ref } from "vue";

type Vertical = "top" | "bottom" | "center";
type Horizontal = "left" | "right" | "center";
export type Direction = `${Vertical}-${Horizontal}`;

const props = defineProps<{
  text?: string;
  direction: Direction;
  to?: string;
  width?: string;
}>();

const slots = defineSlots<{
  default(): any;
  tooltip(): any;
}>();

const isOpen = ref(false);
const wrapper = ref<HTMLDivElement>();
const x = ref(0);
const y = ref(0);

const handleMouseEnter = (event: MouseEvent) => {
  if (!props.text && !slots.tooltip) {
    return;
  }

  isOpen.value = true;

  const [vertical, horizontal] = props.direction.split("-");
  const bbox = wrapper.value!.getBoundingClientRect();
  x.value =
    horizontal === "left"
      ? bbox.left
      : horizontal === "right"
      ? bbox.right
      : bbox.left + bbox.width / 2;

  y.value =
    vertical === "top"
      ? bbox.top
      : vertical === "bottom"
      ? bbox.bottom
      : bbox.top + bbox.height / 2;
};

const className = computed(() => {
  const [vertical, horizontal] = props.direction.split("-");

  return {
    [`vertical-${vertical}`]: true,
    [`horizontal-${horizontal}`]: true,
  };
});

const handleMouseLeave = (event: MouseEvent) => {
  isOpen.value = false;
};
</script>

<template>
  <div
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
    ref="wrapper"
    class="tooltip-wrapper"
  >
    <slot name="default"></slot>
    <Teleport v-if="isOpen" :to="$props.to || '#app'">
      <div
        class="tooltip"
        :style="{ left: `${x}px`, top: `${y}px`, width: props.width }"
        :class="className"
      >
        <slot name="tooltip"> {{ text }}</slot>
      </div>
    </Teleport>
  </div>
</template>

<style lang="scss" scoped>
.tooltip-wrapper {
  display: inline-block;
  width: min-content;
}

.tooltip {
  position: fixed;
  padding: 6px;

  border-radius: var(--small-radius);
  background-color: rgba(0, 0, 0, 0.8);
  border: 1px solid #000;
  color: white;
  translate: var(--horizontal, 0%) var(--vertical, 0%);
  margin: -2px;

  &.horizontal {
    &-left {
      --horizontal: -100%;
    }

    &-center {
      --horizontal: -50%;
    }
  }

  &.vertical {
    &-top {
      --vertical: -100%;
    }

    &-center {
      --vertical: -50%;
    }
  }
}
</style>
