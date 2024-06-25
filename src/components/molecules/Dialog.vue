<script setup lang="ts">
import { ref, watch } from "vue";
import IconButton from "../atoms/IconButton.vue";
import close from "pixelarticons/svg/close.svg";

const props = defineProps<{
  open: boolean;
  title: string;
  onClose: () => void;
  ingame?: boolean;
}>();

const slots = defineSlots<{
  default(): any;
}>();

const dialog = ref<HTMLDialogElement>();
const content = ref<HTMLDivElement>();

const handleClick = (event: MouseEvent) => {
  if (content.value && !content.value.contains(event.target as HTMLElement)) {
    props.onClose();
  }
};

watch(
  () => props.open,
  () => {
    if (props.open) {
      window.addEventListener("mousedown", handleClick);
    } else {
      window.removeEventListener("mousedown", handleClick);
    }
  },
  { immediate: true }
);

watch(
  [dialog, () => props.open] as const,
  ([dialog, open]) => {
    if (!dialog || dialog.open === open) {
      return;
    }

    if (open) {
      window.setTimeout(() => dialog.showModal(), 0);
    } else {
      dialog.close();
    }
  },
  { immediate: true }
);
</script>

<template>
  <dialog ref="dialog" id="dialog">
    <div
      ref="content"
      :class="{ content: true, 'content--ingame': props.ingame }"
    >
      <div class="title">
        <h2>{{ props.title }}</h2>
        <IconButton title="Close" :onClick="$props.onClose" :icon="close" />
      </div>
      <div class="scroller">
        <slot name="default"></slot>
      </div>
    </div>
  </dialog>
</template>

<style lang="scss" scoped>
dialog {
  padding: 0;
  background: none;
  border: none;
  overflow: visible;
  min-width: 300px;
  outline: none;

  &::backdrop {
    animation: fade-in 0.3s forwards;
  }

  @keyframes fade-in {
    from {
      background-color: rgba(0, 0, 0, 0);
    }
    to {
      background-color: rgba(0, 0, 0, 0.5);
    }
  }

  &:before {
    content: "";
    width: 100%;
    height: 100%;
    background: url("../../assets/parchment.png");
    position: absolute;
    display: block;
    border: 2px solid var(--primary);
    rotate: 4deg;
    image-rendering: pixelated;
    background-size: 256px;
    box-shadow: 0 0 16px inset var(--primary), 5px 5px 10px #00000069;
    border-radius: var(--big-radius);
  }

  .content {
    container-type: normal;
    padding: 2cqw 3cqh;
    position: relative;

    &--ingame,
    &--ingame button {
      cursor: url("../../assets/pointer.png"), auto;
    }

    .title {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
      margin-right: -10px;

      h2 {
        margin-right: 10px;
      }
    }

    .scroller {
      max-height: 60vh;
      overflow: auto;
      scrollbar-color: var(--background-dark) transparent;
      scrollbar-width: thin;

      display: flex;
      flex-direction: column;
    }
  }
}
</style>
