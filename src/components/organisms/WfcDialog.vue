<!-- src/components/organisms/WfcDialog.vue -->
<script setup lang="ts">
import { ref } from "vue";
import Dialog from "../molecules/Dialog.vue";
import Input from "../atoms/Input.vue";
import { TILE_SIZE_PX } from "../../data/wfc/tiles";
import type { LadderInfo } from "../../data/wfc/postProcess";
import WfcWorker from "../../data/wfc/wfc.worker?worker";

export interface WfcSettings {
  width: number;
  height: number;
  density: number;
  edgeTop: number;
  edgeBottom: number;
  edgeLeft: number;
  edgeRight: number;
  continuityBonus: number;
}

const { onGenerate, onClose, settings } = defineProps<{
  onGenerate: (maskData: string, ladders: LadderInfo[]) => void;
  onClose: () => void;
  settings: WfcSettings;
}>();

const generating = ref(false);
const error = ref("");

const handleGenerate = () => {
  generating.value = true;
  error.value = "";

  const worker = new WfcWorker();
  worker.postMessage({
    width: settings.width,
    height: settings.height,
    density: settings.density / 100,
    edges: {
      top: settings.edgeTop / 100,
      bottom: settings.edgeBottom / 100,
      left: settings.edgeLeft / 100,
      right: settings.edgeRight / 100,
    },
    continuityBonus: settings.continuityBonus,
  });

  worker.onmessage = (e: MessageEvent) => {
    generating.value = false;
    worker.terminate();

    if (e.data.success && e.data.mask) {
      onGenerate(e.data.mask, e.data.ladders ?? []);
    } else {
      error.value = e.data.error ?? "Generation failed.";
    }
  };

  worker.onerror = () => {
    generating.value = false;
    error.value = "An unexpected error occurred.";
    worker.terminate();
  };
};
</script>

<template>
  <Dialog open :onClose="onClose" title="Generate wallmask">
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
        <span class="label">Density</span>
        <input
          type="range"
          v-model.number="settings.density"
          min="0"
          max="100"
          class="slider"
        />
        <span class="slider-value">{{ settings.density }}%</span>
      </label>

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

      <div class="edges-section">
        <span class="label">Edges</span>
        <div class="edges-grid">
          <label class="slider-label">
            <span class="edge-label">Top</span>
            <input
              type="range"
              v-model.number="settings.edgeTop"
              min="0"
              max="100"
              class="slider"
            />
            <span class="slider-value">{{ settings.edgeTop }}%</span>
          </label>
          <label class="slider-label">
            <span class="edge-label">Bottom</span>
            <input
              type="range"
              v-model.number="settings.edgeBottom"
              min="0"
              max="100"
              class="slider"
            />
            <span class="slider-value">{{ settings.edgeBottom }}%</span>
          </label>
          <label class="slider-label">
            <span class="edge-label">Left</span>
            <input
              type="range"
              v-model.number="settings.edgeLeft"
              min="0"
              max="100"
              class="slider"
            />
            <span class="slider-value">{{ settings.edgeLeft }}%</span>
          </label>
          <label class="slider-label">
            <span class="edge-label">Right</span>
            <input
              type="range"
              v-model.number="settings.edgeRight"
              min="0"
              max="100"
              class="slider"
            />
            <span class="slider-value">{{ settings.edgeRight }}%</span>
          </label>
        </div>
      </div>

      <p v-if="error" class="error">{{ error }}</p>

      <div class="actions">
        <button class="primary" @click="handleGenerate" :disabled="generating">
          <span v-if="generating" class="spinner-row">
            <span class="spinner">&#x07F7;</span>
            Generating...
          </span>
          <span v-else>Generate</span>
        </button>
        <button class="secondary" @click="onClose">Cancel</button>
      </div>
    </div>
  </Dialog>
</template>

<style lang="scss" scoped>
.wfc-params {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 320px;
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
}

.edges-section {
  display: flex;
  flex-direction: column;
  gap: 6px;

  > .label {
    font-family: Eternal;
    font-size: 24px;
    color: var(--primary);
  }
}

.edges-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px 16px;
}

.error {
  color: var(--highlight);
  font-size: 13px;
}

.actions {
  display: flex;
  gap: 8px;
  margin-top: 4px;
}

.spinner-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}
</style>
