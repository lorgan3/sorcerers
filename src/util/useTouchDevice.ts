import { onMounted, onUnmounted, ref, Ref } from "vue";

function detectInitialTouch(): boolean {
  if (typeof window === "undefined") return false;
  return navigator.maxTouchPoints > 0;
}

export function createTouchDeviceState(): {
  showTouchControls: Ref<boolean>;
  onPointerDown: (event: PointerEvent) => void;
  onKeyDown: () => void;
} {
  const showTouchControls = ref(detectInitialTouch());

  const onPointerDown = (event: PointerEvent) => {
    if (event.pointerType === "touch") {
      showTouchControls.value = true;
    }
  };

  const onKeyDown = () => {
    showTouchControls.value = false;
  };

  return { showTouchControls, onPointerDown, onKeyDown };
}

export function useTouchDevice(): { showTouchControls: Ref<boolean> } {
  const { showTouchControls, onPointerDown, onKeyDown } =
    createTouchDeviceState();

  onMounted(() => {
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
  });

  onUnmounted(() => {
    window.removeEventListener("pointerdown", onPointerDown);
    window.removeEventListener("keydown", onKeyDown);
  });

  return { showTouchControls };
}
