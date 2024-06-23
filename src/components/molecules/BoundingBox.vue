<script setup lang="ts">
import { ref } from "vue";
import { BBox } from "../../data/map/bbox";

const props = defineProps<{
  bbox: BBox;
  onChange: (bbox: BBox) => void;
  color?: string;
}>();

const DIRECTIONS = {
  left: { get: "clientX", opposite: "right", clamp: Math.min },
  top: { get: "clientY", opposite: "bottom", clamp: Math.min },
  right: { get: "clientX", opposite: "left", clamp: Math.max },
  bottom: { get: "clientY", opposite: "top", clamp: Math.max },
} as const;

const offsets = ref({
  left: 0,
  top: 0,
  right: 0,
  bottom: 0,
});

const handleMouseDown = (
  event: MouseEvent,
  direction: "left" | "top" | "right" | "bottom"
) => {
  event.stopPropagation();
  event.preventDefault();

  const { bbox, onChange } = props;
  const start = event[DIRECTIONS[direction].get];
  const max = Math.round(
    bbox[DIRECTIONS[direction].opposite] - bbox[direction]
  );
  let diff = 0;

  const handleMouseMove = (moveEvent: MouseEvent) => {
    diff = Math.round(
      DIRECTIONS[direction].clamp(
        (moveEvent[DIRECTIONS[direction].get] - start) / 6,
        max
      )
    );

    offsets.value[direction] = diff;
  };

  const handleMouseUp = () => {
    onChange(bbox.with(direction, bbox[direction] + diff));

    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
    document.onselectstart = null;
    offsets.value = BBox.create(0, 0);
  };

  document.addEventListener("mousemove", handleMouseMove);
  document.addEventListener("mouseup", handleMouseUp);
  document.onselectstart = () => false;
};
</script>

<template>
  <div
    class="bbox"
    :style="{
      '--left': `${(bbox.left + offsets.left) * 6}px`,
      '--top': `${(bbox.top + offsets.top) * 6}px`,
      '--right': `${(bbox.right + offsets.right) * 6}px`,
      '--bottom': `${(bbox.bottom + offsets.bottom) * 6}px`,
      '--color': props.color,
    }"
  >
    <div
      v-for="(_, direction) in DIRECTIONS"
      :class="`resize-handler resize-handler--${direction}`"
      @mousedown="(event) => handleMouseDown(event, direction)"
    ></div>
  </div>
</template>

<style lang="scss" scoped>
.bbox {
  --handler-width: 6px;

  .resize-handler {
    position: absolute;
    background: var(--color, #f00);

    &--left,
    &--right {
      top: var(--top);
      width: var(--handler-width);
      height: calc(var(--bottom) - var(--top));
      cursor: ew-resize;
    }

    &--top,
    &--bottom {
      left: var(--left);
      width: calc(var(--right) - var(--left));
      height: var(--handler-width);
      cursor: ns-resize;
    }

    &--left {
      left: var(--left);
    }

    &--top {
      top: var(--top);
    }

    &--right {
      left: calc(var(--right) - var(--handler-width));
    }

    &--bottom {
      top: calc(var(--bottom) - var(--handler-width));
    }
  }
}
</style>
