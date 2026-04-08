<!-- src/components/organisms/WfcDialog.vue -->
<script setup lang="ts">
import { ref } from "vue";
import Dialog from "../molecules/Dialog.vue";
import Input from "../atoms/Input.vue";
import { TILE_SIZE_PX } from "../../data/wfc/tiles";
import type { SeedTile } from "../../data/wfc/wfc";
import WfcWorker from "../../data/wfc/wfc.worker?worker";

export type SeedPreset = "none" | "platforms" | "pyramid";

export interface WfcSettings {
  width: number;
  height: number;
  density: number;
  edgeTop: number;
  edgeBottom: number;
  edgeLeft: number;
  edgeRight: number;
  seedPreset: SeedPreset;
  flatness: number;
}

const { onGenerate, onClose, settings } = defineProps<{
  onGenerate: (maskData: string) => void;
  onClose: () => void;
  settings: WfcSettings;
}>();

const generating = ref(false);
const error = ref("");

function generateSeeds(
  preset: SeedPreset,
  width: number,
  height: number
): SeedTile[] {
  if (preset === "platforms") {
    const seeds: SeedTile[] = [];
    const solidRun = 4;
    const gap = 10;
    for (let y = 5; y < height; y += 6) {
      const totalPattern = Math.floor(width / gap);
      const patternWidth = totalPattern * gap;
      const offset = Math.floor((width - patternWidth) / 2);
      for (let x = offset; x < width - offset; x++) {
        const pos = (x - offset) % gap;
        // Only seed solid tiles, leave rest for WFC to fill
        if (pos < solidRun) {
          seeds.push({ x, y, tileId: "solid" });
        }
      }
    }
    return seeds;
  }

  if (preset === "pyramid") {
    const seeds: SeedTile[] = [];
    const centerX = Math.floor(width / 2);
    const baseY = height - 1;
    const topY = Math.floor(height / 3);
    const pyramidHeight = baseY - topY;

    // Build set of pyramid positions, then only seed interior tiles
    const pyramidCells = new Set<string>();
    for (let y = topY; y <= baseY; y++) {
      const progress = (y - topY) / pyramidHeight;
      const halfWidth = Math.floor(progress * (width / 4));
      for (let x = centerX - halfWidth; x <= centerX + halfWidth; x++) {
        if (x >= 0 && x < width) {
          pyramidCells.add(`${x},${y}`);
        }
      }
    }

    // Only seed cells whose neighbors are also in the pyramid (skip edges)
    for (const key of pyramidCells) {
      const [x, y] = key.split(",").map(Number);
      const allNeighborsInside = [
        [x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1],
      ].every(([nx, ny]) => pyramidCells.has(`${nx},${ny}`));
      if (allNeighborsInside) {
        seeds.push({ x, y, tileId: "solid" });
      }
    }
    return seeds;
  }

  return [];
}

const handleGenerate = () => {
  generating.value = true;
  error.value = "";

  const seeds = generateSeeds(
    settings.seedPreset,
    settings.width,
    settings.height
  );

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
    seeds: seeds.length > 0 ? seeds : undefined,
    flatness: settings.flatness / 100,
  });

  worker.onmessage = (e) => {
    generating.value = false;
    worker.terminate();

    if (e.data.success) {
      onGenerate(e.data.data);
    } else {
      error.value = e.data.error;
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
        <span class="label">Flatness</span>
        <input
          type="range"
          v-model.number="settings.flatness"
          min="0"
          max="100"
          class="slider"
        />
        <span class="slider-value">{{ settings.flatness }}%</span>
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

      <label class="select-label">
        <span class="label">Structure</span>
        <select v-model="settings.seedPreset" class="select">
          <option value="none">None</option>
          <option value="platforms">Platforms</option>
          <option value="pyramid">Pyramid</option>
        </select>
      </label>

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
    min-width: 60px;
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

.select-label {
  display: flex;
  align-items: center;
  gap: 8px;

  .label {
    font-family: Eternal;
    font-size: 24px;
    color: var(--primary);
    min-width: 60px;
  }

  .select {
    flex: 1;
    padding: 4px 8px;
    font-size: 14px;
    background: rgba(0, 0, 0, 0.1);
    border: 1px solid var(--border-accent-faint);
    border-radius: 4px;
    color: var(--primary);
  }
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
