<script setup lang="ts">
import { ref } from "vue";
import { BBox } from "../../data/map/bbox";
import close from "pixelarticons/svg/close.svg";
import IconButton from "../atoms/IconButton.vue";

const props = defineProps<{
  bbox: BBox;
  onChange: (bbox: BBox) => void;
  color?: string;
  onClear?: () => void;
  draggable?: boolean;
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
const moving = ref(false);

const handleResize = (
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

const handleMove = (event: MouseEvent) => {
  event.stopPropagation();
  event.preventDefault();

  const { bbox, onChange } = props;
  const x = event.pageX;
  const y = event.pageY;
  moving.value = true;

  const handleMouseMove = (moveEvent: MouseEvent) => {
    offsets.value["left"] = Math.round((moveEvent.pageX - x) / 6);
    offsets.value["top"] = Math.round((moveEvent.pageY - y) / 6);
    offsets.value["right"] = Math.round((moveEvent.pageX - x) / 6);
    offsets.value["bottom"] = Math.round((moveEvent.pageY - y) / 6);
  };

  const handleMouseUp = () => {
    onChange(bbox.move(offsets.value["left"], offsets.value["top"]));

    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
    document.onselectstart = null;
    offsets.value = BBox.create(0, 0);
    moving.value = false;
  };

  document.addEventListener("mousemove", handleMouseMove);
  document.addEventListener("mouseup", handleMouseUp);
  document.onselectstart = () => false;
};
</script>

<template>
  <div
    :class="{ bbox: true, 'bbox--moving': moving }"
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
      @mousedown="(event) => handleResize(event, direction)"
    ></div>
    <div v-if="props.draggable" class="fill" @mousedown="handleMove"></div>
    <IconButton
      className="button"
      v-if="onClear"
      title="Clear"
      :onClick="onClear"
      :icon="close"
    />
  </div>
</template>

<style lang="scss" scoped>
.bbox {
  --handler-width: 6px;

  &--moving {
    .fill {
      z-index: 1;
    }
  }

  .button {
    position: absolute;
    top: calc(var(--top) + 10px);
    left: calc(var(--right) - 28px);
  }

  .fill {
    position: absolute;
    background: var(--color, #f00);
    opacity: 0.2;
    top: calc(var(--top) + var(--handler-width));
    left: calc(var(--left) + var(--handler-width));
    width: calc(
      var(--right) - var(--left) - var(--handler-width) - var(--handler-width)
    );
    height: calc(
      var(--bottom) - var(--top) - var(--handler-width) - var(--handler-width)
    );
    cursor: grab;
    transition: opacity 0.2s;

    &:hover {
      opacity: 0.4;
    }
  }

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
