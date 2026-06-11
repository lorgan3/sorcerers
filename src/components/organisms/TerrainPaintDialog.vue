<script setup lang="ts">
import { ref, shallowRef, watch } from "vue";
import Dialog from "../molecules/Dialog.vue";
import {
  paintTerrain,
  type PaintResult,
} from "../../data/terrainPaint";
import { THEMES, THEME_IDS } from "../../data/terrainPaint/palettes";
import type { ZoneInfo } from "../../data/terrainPaint/zones";
import type { PlainBBox } from "../../data/map/bbox";

const PREVIEW_SCALE = 2;

const props = defineProps<{
  alphaSrc: string;
  ladders: PlainBBox[];
  onConfirm: (result: {
    terrain: string;
    background: string;
    width: number;
    height: number;
  }) => void;
  onClose: () => void;
}>();

const seed = ref(1);
const overrides = ref<Record<number, string>>({});
const zones = ref<ZoneInfo[]>([]);
const showBackgroundOnly = ref(false);

const alphaData = ref<{ alpha: Uint8Array; width: number; height: number }>();
const result = shallowRef<PaintResult>();

watch(
  () => props.alphaSrc,
  (src) => {
    const img = new Image();
    img.onload = () => {
      const canvas = new OffscreenCanvas(img.width, img.height);
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      const pixels = ctx.getImageData(0, 0, img.width, img.height).data;
      const alpha = new Uint8Array(img.width * img.height);
      for (let i = 0; i < alpha.length; i++) {
        alpha[i] = pixels[i * 4 + 3] > 128 ? 1 : 0;
      }
      alphaData.value = { alpha, width: img.width, height: img.height };
    };
    img.src = src;
  },
  { immediate: true }
);

const previewCanvas = ref<HTMLCanvasElement>();

watch(
  [alphaData, seed, overrides, () => props.ladders],
  () => {
    const ad = alphaData.value;
    if (!ad) return;

    const res = paintTerrain({
      alpha: ad.alpha,
      width: ad.width,
      height: ad.height,
      ladders: props.ladders,
      seed: seed.value,
      themeOverrides: overrides.value,
    });
    result.value = res;
    zones.value = res.zones;
  },
  { immediate: true }
);

// composing the preview is cheap; repainting is not — keep them separate so
// toggling the background view doesn't re-run the whole paint pipeline
watch(
  [result, previewCanvas, showBackgroundOnly],
  () => {
    const ad = alphaData.value;
    const res = result.value;
    const canvas = previewCanvas.value;
    if (!ad || !res || !canvas) return;

    const compose = new OffscreenCanvas(ad.width, ad.height);
    const cctx = compose.getContext("2d")!;
    cctx.putImageData(res.background, 0, 0);
    if (!showBackgroundOnly.value) {
      const terrainCanvas = new OffscreenCanvas(ad.width, ad.height);
      terrainCanvas.getContext("2d")!.putImageData(res.terrain, 0, 0);
      cctx.drawImage(terrainCanvas, 0, 0);
    }

    canvas.width = ad.width * PREVIEW_SCALE;
    canvas.height = ad.height * PREVIEW_SCALE;
    const ctx = canvas.getContext("2d")!;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(compose, 0, 0, canvas.width, canvas.height);
  },
  { immediate: true }
);

const handleReroll = () => {
  seed.value++;
  overrides.value = {};
};

const setOverride = (zoneId: number, themeId: string) => {
  overrides.value = { ...overrides.value, [zoneId]: themeId };
};

const blobToDataUrl = (blob: Blob): Promise<string> =>
  new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });

function handleConfirm() {
  const ad = alphaData.value;
  const res = result.value;
  if (!ad || !res || res.zones.length === 0) return;

  const toDataUrl = (img: ImageData) => {
    const canvas = new OffscreenCanvas(ad.width, ad.height);
    canvas.getContext("2d")!.putImageData(img, 0, 0);
    return canvas.convertToBlob({ type: "image/png" }).then(blobToDataUrl);
  };

  Promise.all([toDataUrl(res.terrain), toDataUrl(res.background)]).then(
    ([terrain, background]) => {
      props.onConfirm({
        terrain,
        background,
        width: ad.width,
        height: ad.height,
      });
    }
  );
}
</script>

<template>
  <Dialog open :onClose="onClose" title="Paint terrain">
    <div class="paint-dialog">
      <div class="preview-scroll">
        <canvas ref="previewCanvas" class="preview" />
      </div>

      <label class="checkbox-control">
        <input type="checkbox" v-model="showBackgroundOnly" />
        <span>Show background only</span>
      </label>

      <div class="zones" v-if="zones.length">
        <div class="zone-row" v-for="zone in zones" :key="zone.id">
          <span class="label">Zone {{ zone.id + 1 }}</span>
          <select
            :value="zone.themeId"
            @change="(e) => setOverride(zone.id, (e.target as HTMLSelectElement).value)"
          >
            <option v-for="id in THEME_IDS" :key="id" :value="id">
              {{ THEMES[id].name }}
            </option>
          </select>
        </div>
      </div>

      <div class="actions">
        <button class="primary" :disabled="zones.length === 0" @click="handleConfirm">
          Confirm
        </button>
        <button class="secondary" @click="handleReroll">Re-roll</button>
        <button class="secondary" @click="onClose">Cancel</button>
      </div>
    </div>
  </Dialog>
</template>

<style lang="scss" scoped>
.paint-dialog {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 400px;
}

.preview-scroll {
  overflow: auto;
  max-width: 600px;
  max-height: 300px;
  border: 1px solid var(--border-accent-faint);
  border-radius: 4px;
  scrollbar-color: var(--background-dark) transparent;
  scrollbar-width: thin;
}

.preview {
  image-rendering: pixelated;
  background: repeating-conic-gradient(#ccc 0% 25%, #eee 0% 50%) 0 0 / 16px 16px;
}

.zones {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 160px;
  overflow-y: auto;
}

.zone-row {
  display: flex;
  align-items: center;
  gap: 8px;

  .label {
    font-family: Eternal;
    font-size: 24px;
    color: var(--primary);
    min-width: 80px;
  }

  select {
    flex: 1;
  }
}

.checkbox-control {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-family: Eternal;
  font-size: 24px;
  color: var(--primary);

  input[type="checkbox"] {
    width: 18px;
    height: 18px;
    accent-color: var(--primary);
    cursor: pointer;
  }
}

.actions {
  display: flex;
  gap: 8px;
  margin-top: 4px;
}
</style>
