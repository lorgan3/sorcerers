<!-- src/components/organisms/WfcDialog.vue -->
<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from "vue";
import Dialog from "../molecules/Dialog.vue";
import Input from "../atoms/Input.vue";
import { TILE_SIZE_PX } from "../../data/wfc/tiles";
import { buildDefaultMask } from "../../data/wfc/mask";
import type { LadderInfo } from "../../data/wfc/postProcess";
import { runWfc, type WfcSettings } from "../../data/wfc/runWfc";

export type { WfcSettings };

const { onGenerate, onClose, onBack, settings, initialError } = defineProps<{
  onGenerate: (maskData: string, ladders: LadderInfo[]) => void;
  onClose: () => void;
  onBack: () => void;
  settings: WfcSettings;
  initialError?: string;
}>();

const generating = ref(false);
const error = ref(initialError ?? "");
const canvas = ref<HTMLCanvasElement | null>(null);
const maskWrap = ref<HTMLElement | null>(null);
const painting = ref<null | "draw" | "erase">(null);
let resizeObserver: ResizeObserver | null = null;

// Scale the canvas to fit whatever space the editor row has, preserving the
// map aspect. Driving the display size off the available box (rather than a
// fixed height) keeps the dialog scrollbar-free at any viewport or map shape.
function fitCanvas() {
  const wrap = maskWrap.value;
  const c = canvas.value;
  if (!wrap || !c) return;
  const availW = wrap.clientWidth;
  const availH = wrap.clientHeight;
  if (availW <= 0 || availH <= 0) return;
  const aspect = settings.width / Math.max(1, settings.height);
  const dispW = Math.min(availW, availH * aspect);
  c.style.width = `${dispW}px`;
  c.style.height = `${dispW / aspect}px`;
}

function draw() {
  const c = canvas.value;
  const mask = settings.densityMask;
  if (!c || !mask) return;
  const ctx = c.getContext("2d")!;
  ctx.clearRect(0, 0, c.width, c.height);
  for (let y = 0; y < settings.height; y++) {
    for (let x = 0; x < settings.width; x++) {
      const v = mask[y * settings.width + x];
      if (!v) continue;
      ctx.fillStyle = `rgba(0, 0, 0, ${v / 255})`;
      ctx.fillRect(x, y, 1, 1);
    }
  }
}

function sizeBackingStore() {
  const c = canvas.value;
  if (c) {
    c.width = settings.width;
    c.height = settings.height;
  }
}

function resetMask() {
  settings.densityMask = buildDefaultMask(settings.width, settings.height);
  sizeBackingStore();
  fitCanvas();
  draw();
}

function paint(e: PointerEvent) {
  const c = canvas.value;
  const mask = settings.densityMask;
  if (!c || !mask || !painting.value) return;
  const rect = c.getBoundingClientRect();
  const px = Math.floor(((e.clientX - rect.left) / rect.width) * settings.width);
  const py = Math.floor(((e.clientY - rect.top) / rect.height) * settings.height);
  if (px < 0 || px >= settings.width || py < 0 || py >= settings.height) return;
  mask[py * settings.width + px] =
    painting.value === "erase" ? 0 : Math.round((settings.density / 100) * 255);
  draw();
}

function onPointerDown(e: PointerEvent) {
  if (e.button === 0) painting.value = "draw";
  else if (e.button === 2) painting.value = "erase";
  else return;
  canvas.value?.setPointerCapture(e.pointerId);
  paint(e);
}

function onPointerUp(e: PointerEvent) {
  painting.value = null;
  if (canvas.value?.hasPointerCapture(e.pointerId)) {
    canvas.value.releasePointerCapture(e.pointerId);
  }
}

onMounted(() => {
  // Preserve a previously drawn mask when returning to this step; only build
  // the default pattern when none exists for the current dimensions.
  const mask = settings.densityMask;
  if (mask && mask.length === settings.width * settings.height) {
    sizeBackingStore();
    fitCanvas();
    draw();
  } else {
    resetMask();
  }
  if (maskWrap.value) {
    resizeObserver = new ResizeObserver(() => fitCanvas());
    resizeObserver.observe(maskWrap.value);
  }
});
onUnmounted(() => resizeObserver?.disconnect());
watch(() => [settings.width, settings.height], resetMask);

const handleGenerate = () => {
  generating.value = true;
  error.value = "";

  runWfc(settings).promise
    .then(({ mask, ladders }) => onGenerate(mask, ladders))
    .catch((err: Error) => (error.value = err.message))
    .finally(() => (generating.value = false));
};
</script>

<template>
  <Dialog open seamless :onClose="onClose" title="Generate wallmask">
    <div class="wfc-params">
      <div class="size-row">
        <Input label="Width (tiles)" v-model="settings.width" :max="60" />
        <Input label="Height (tiles)" v-model="settings.height" :max="30" />
      </div>
      <div class="size-hint">
        {{ settings.width * TILE_SIZE_PX }} ×
        {{ settings.height * TILE_SIZE_PX }} pixels
      </div>

      <label class="slider-label">
        <span class="label">Continuity</span>
        <input
          type="range"
          v-model.number="settings.continuityBonus"
          min="1"
          max="5"
          step="0.1"
          class="slider"
        />
        <span class="slider-value">{{ settings.continuityBonus.toFixed(1) }}</span>
      </label>

      <label class="slider-label">
        <span class="label">Reduce blockages</span>
        <input type="checkbox" v-model="settings.preventBlockages" class="checkbox" />
      </label>

      <div class="mask-editor">
        <span class="section-title">Density mask</span>
        <p class="editor-hint">Left-click to draw, right-click to erase</p>
        <div class="editor-row">
          <div class="density-control">
            <input
              type="range"
              v-model.number="settings.density"
              min="0"
              max="100"
              class="density-slider"
            />
            <span class="slider-value">{{ settings.density }}%</span>
          </div>
          <div ref="maskWrap" class="mask-wrap">
            <canvas
              ref="canvas"
              class="mask-canvas"
              @pointerdown="onPointerDown"
              @pointermove="paint"
              @pointerup="onPointerUp"
              @pointerleave="onPointerUp"
              @contextmenu.prevent
            />
          </div>
        </div>
      </div>

      <p v-if="error" class="error">{{ error }}</p>

      <div class="actions">
        <button class="secondary" @click="onBack">Back</button>
        <button class="primary" @click="handleGenerate" :disabled="generating">
          <span v-if="generating" class="spinner-row">
            <span class="spinner">&#x07F7;</span>
            Generating...
          </span>
          <span v-else>Next</span>
        </button>
      </div>
    </div>
  </Dialog>
</template>

<style lang="scss" scoped>
.wfc-params {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: var(--wizard-body-width);
  height: var(--wizard-body-height);
}

.size-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.size-hint {
  font-size: 12px;
  color: var(--primary);
  opacity: 0.6;
  margin-top: -8px;
}

.slider-label {
  display: flex;
  align-items: center;
  gap: 8px;

  .label,
  .edge-label {
    font-family: Eternal;
    font-size: 24px;
    color: var(--primary);
    min-width: 80px;
  }

  .edge-label {
    font-size: 20px;
    min-width: 50px;
  }

  .slider {
    flex: 1;
    accent-color: var(--primary);
  }

  .slider-value {
    min-width: 36px;
    text-align: right;
    font-size: 13px;
  }

  .checkbox {
    width: 18px;
    height: 18px;
    accent-color: var(--primary);
    cursor: pointer;
  }
}

.section-title {
  font-family: Eternal;
  font-size: 24px;
  color: var(--primary);
}

// The editor fills the space left after the fixed controls, so the dialog
// body never overflows; the canvas is sized to fit by fitCanvas().
.mask-editor {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.editor-row {
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: stretch;
  gap: 10px;
}

.mask-wrap {
  flex: 1;
  min-width: 0;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.mask-canvas {
  // width/height are set by fitCanvas() to fit the wrap, preserving aspect.
  box-sizing: border-box;
  background: #fff;
  border: 1px solid var(--primary);
  image-rendering: pixelated;
  cursor: crosshair;
  touch-action: none;
}

.density-control {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;

  .density-slider {
    flex: 1;
    min-height: 0;
    writing-mode: vertical-lr;
    direction: rtl;
    accent-color: var(--primary);
    cursor: pointer;
  }

  .slider-value {
    min-width: 40px;
    text-align: center;
    font-size: 13px;
    color: var(--primary);
  }
}

.editor-hint {
  font-size: 12px;
  color: var(--primary);
  opacity: 0.6;
}

.error {
  color: var(--highlight);
  font-size: 13px;
}

.actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: auto;

  // back button pinned left, primary action to the right
  > :first-child {
    margin-right: auto;
  }
}

.spinner-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

</style>
