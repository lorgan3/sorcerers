<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from "vue";
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

const press = (event: TouchEvent, key: Key) => {
  event.preventDefault();
  controller.keyDown(key);
};

const release = (event: TouchEvent, key: Key) => {
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

watch(showTouchControls, (visible) => {
  if (!visible) {
    controller.keyUp(Key.W);
    controller.keyUp(Key.A);
    controller.keyUp(Key.S);
    controller.keyUp(Key.D);
    controller.setSuppressTouchCast(false);
  }
});

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
    <div class="cluster">
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

      <div class="dpad">
        <button
          class="btn dpad__up"
          @touchstart="press($event, Key.W)"
          @touchend="release($event, Key.W)"
          @touchcancel="release($event, Key.W)"
        >
          ▲
        </button>
        <button
          class="btn dpad__left"
          @touchstart="press($event, Key.A)"
          @touchend="release($event, Key.A)"
          @touchcancel="release($event, Key.A)"
        >
          ◀
        </button>
        <button
          class="btn dpad__right"
          @touchstart="press($event, Key.D)"
          @touchend="release($event, Key.D)"
          @touchcancel="release($event, Key.D)"
        >
          ▶
        </button>
        <button
          class="btn dpad__down"
          @touchstart="press($event, Key.S)"
          @touchend="release($event, Key.S)"
          @touchcancel="release($event, Key.S)"
        >
          ▼
        </button>
      </div>
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

// Anchored bottom-right but offset left to clear the ~225px inventory dock,
// keeping every control off the bottom-left HUD.
.cluster {
  position: absolute;
  bottom: calc(env(safe-area-inset-bottom, 0px) + 16px);
  right: calc(env(safe-area-inset-right, 0px) + 240px);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  pointer-events: none;
}

.actions {
  display: flex;
  gap: 12px;
  pointer-events: none;
}

.dpad {
  position: relative;
  width: 180px;
  height: 180px;
  pointer-events: none;
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
