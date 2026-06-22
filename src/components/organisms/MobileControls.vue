<script setup lang="ts">
import { onBeforeUnmount, ref } from "vue";
import { Controller, Key } from "../../data/controller/controller";
import { KeyboardController } from "../../data/controller/keyboardController";
import { getLevel } from "../../data/context";
import { PanMode } from "../../graphics/cameraTarget";
import { useTouchDevice } from "../../util/useTouchDevice";

const props = defineProps<{ controller: Controller }>();

// The local player's controller is always a KeyboardController.
const controller = props.controller as KeyboardController;

const { showTouchControls } = useTouchDevice();
const panMode = ref<PanMode>(PanMode.Focused);

const press = (key: Key) => (event: TouchEvent) => {
  event.preventDefault();
  controller.keyDown(key);
};

const release = (key: Key) => (event: TouchEvent) => {
  event.preventDefault();
  controller.keyUp(key);
};

const toggleSpellbook = (event: TouchEvent) => {
  event.preventDefault();
  controller.keyDown(Key.M2);
  controller.keyUp(Key.M2);
};

const cyclePan = (event: TouchEvent) => {
  event.preventDefault();
  const camera = getLevel().cameraTarget;
  panMode.value = camera.cyclePanMode();
  controller.setSuppressTouchCast(panMode.value !== PanMode.Focused);
};

const unsubscribeAttach = getLevel().cameraTarget.addAttachListener(
  (detached) => {
    if (!detached) {
      panMode.value = PanMode.Focused;
      controller.setSuppressTouchCast(false);
    }
  }
);

const panLabel = () => {
  switch (panMode.value) {
    case PanMode.Panning:
      return "pan";
    case PanMode.Frozen:
      return "lock";
    default:
      return "focus";
  }
};

onBeforeUnmount(() => {
  unsubscribeAttach();
  controller.keyUp(Key.W);
  controller.keyUp(Key.A);
  controller.keyUp(Key.S);
  controller.keyUp(Key.D);
  controller.setSuppressTouchCast(false);
});
</script>

<template>
  <div v-if="showTouchControls" class="mobile-controls">
    <div class="dpad">
      <button
        class="btn dpad__up"
        @touchstart="press(Key.W)"
        @touchend="release(Key.W)"
        @touchcancel="release(Key.W)"
      >
        ▲
      </button>
      <button
        class="btn dpad__left"
        @touchstart="press(Key.A)"
        @touchend="release(Key.A)"
        @touchcancel="release(Key.A)"
      >
        ◀
      </button>
      <button
        class="btn dpad__right"
        @touchstart="press(Key.D)"
        @touchend="release(Key.D)"
        @touchcancel="release(Key.D)"
      >
        ▶
      </button>
      <button
        class="btn dpad__down"
        @touchstart="press(Key.S)"
        @touchend="release(Key.S)"
        @touchcancel="release(Key.S)"
      >
        ▼
      </button>
    </div>

    <div class="actions">
      <button class="btn" @touchstart="toggleSpellbook">book</button>
      <button
        class="btn"
        :class="`btn--pan-${panLabel()}`"
        @touchstart="cyclePan"
      >
        {{ panLabel() }}
      </button>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.mobile-controls {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 10;
}

.dpad,
.actions {
  position: absolute;
  bottom: calc(env(safe-area-inset-bottom, 0px) + 16px);
  pointer-events: none;
}

.dpad {
  left: calc(env(safe-area-inset-left, 0px) + 16px);
  width: 180px;
  height: 180px;
}

.actions {
  right: calc(env(safe-area-inset-right, 0px) + 16px);
  display: flex;
  gap: 12px;
}

.btn {
  pointer-events: auto;
  touch-action: none;
  user-select: none;
  width: 60px;
  height: 60px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.6);
  background: rgba(0, 0, 0, 0.35);
  color: #fff;
  font-size: 20px;
  display: flex;
  align-items: center;
  justify-content: center;

  &:active {
    background: rgba(255, 255, 255, 0.3);
  }

  &--pan-pan {
    border-color: #6cf;
  }

  &--pan-lock {
    border-color: #fc6;
  }
}

.dpad__up {
  position: absolute;
  top: 0;
  left: 60px;
}
.dpad__left {
  position: absolute;
  top: 60px;
  left: 0;
}
.dpad__right {
  position: absolute;
  top: 60px;
  left: 120px;
}
.dpad__down {
  position: absolute;
  top: 120px;
  left: 60px;
}
</style>
