<script setup lang="ts">
import { computed, ref, shallowRef, watch } from "vue";
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

const SEED = 1;
const MIXED = "mixed";

const overrides = ref<Record<number, string>>({});
const zones = ref<ZoneInfo[]>([]);
const selectedZone = ref<number | null>(null);
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
  [alphaData, overrides, () => props.ladders],
  () => {
    const ad = alphaData.value;
    if (!ad) return;

    const res = paintTerrain({
      alpha: ad.alpha,
      width: ad.width,
      height: ad.height,
      ladders: props.ladders,
      seed: SEED,
      themeOverrides: overrides.value,
    });
    result.value = res;
    zones.value = res.zones;
    if (selectedZone.value !== null && selectedZone.value >= res.zones.length) {
      selectedZone.value = null;
    }
  },
  { immediate: true }
);

// composing the preview is cheap; repainting is not — keep them separate so
// toggling the background view doesn't re-run the whole paint pipeline
watch(
  [result, previewCanvas, showBackgroundOnly, selectedZone],
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

    const zone =
      selectedZone.value !== null ? res.zones[selectedZone.value] : undefined;
    if (zone) {
      const { left, top, right, bottom } = zone.bbox;
      const rect = [
        left * PREVIEW_SCALE - 1,
        top * PREVIEW_SCALE - 1,
        (right - left) * PREVIEW_SCALE + 2,
        (bottom - top) * PREVIEW_SCALE + 2,
      ] as const;
      ctx.setLineDash([6, 4]);
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 3;
      ctx.strokeRect(...rect);
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(...rect);
      ctx.setLineDash([]);
    }
  },
  { immediate: true }
);

const handlePreviewClick = (event: MouseEvent) => {
  const res = result.value;
  const ad = alphaData.value;
  if (!res || !ad) return;
  const x = Math.floor(event.offsetX / PREVIEW_SCALE);
  const y = Math.floor(event.offsetY / PREVIEW_SCALE);
  if (x < 0 || y < 0 || x >= ad.width || y >= ad.height) return;
  const zone = res.zoneMap[y * ad.width + x];
  selectedZone.value = zone >= 0 ? zone : null;
};

const handleThemeChange = (event: Event) => {
  const themeId = (event.target as HTMLSelectElement).value;
  if (selectedZone.value !== null) {
    setOverride(selectedZone.value, themeId);
  } else {
    const all: Record<number, string> = {};
    for (const zone of zones.value) {
      all[zone.id] = themeId;
    }
    overrides.value = all;
  }
};

const setOverride = (zoneId: number, themeId: string) => {
  overrides.value = { ...overrides.value, [zoneId]: themeId };
};

const selectValue = computed(() => {
  if (selectedZone.value !== null) {
    return zones.value[selectedZone.value]?.themeId ?? MIXED;
  }
  const ids = new Set(zones.value.map((zone) => zone.themeId));
  return ids.size === 1 ? zones.value[0].themeId : MIXED;
});

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
        <canvas ref="previewCanvas" class="preview" @click="handlePreviewClick" />
      </div>

      <label class="checkbox-control">
        <input type="checkbox" v-model="showBackgroundOnly" />
        <span>Show background only</span>
      </label>

      <div class="zone-row" v-if="zones.length">
        <span class="label">
          {{ selectedZone === null ? "All zones" : "Selected zone" }}
        </span>
        <select :value="selectValue" @change="handleThemeChange">
          <option v-if="selectValue === MIXED" disabled :value="MIXED">
            Mixed
          </option>
          <option v-for="id in THEME_IDS" :key="id" :value="id">
            {{ THEMES[id].name }}
          </option>
        </select>
      </div>
      <p class="hint">
        Click a zone in the preview to change it individually, click empty
        space to change all zones at once.
      </p>

      <div class="actions">
        <button class="primary" :disabled="zones.length === 0" @click="handleConfirm">
          Confirm
        </button>
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
  display: block;
  cursor: pointer;
  image-rendering: pixelated;
  background: repeating-conic-gradient(#ccc 0% 25%, #eee 0% 50%) 0 0 / 16px 16px;
}

.hint {
  font-family: Eternal;
  font-size: 20px;
  color: var(--primary);
  opacity: 0.8;
}

.zone-row {
  display: flex;
  align-items: center;
  gap: 8px;

  .label {
    font-family: Eternal;
    font-size: 24px;
    color: var(--primary);
    min-width: 130px;
  }

  select {
    flex: 1;
    background: linear-gradient(180deg, var(--parchment-light), var(--parchment-dark));
    border: 1px solid var(--border-accent-faint);
    border-radius: var(--small-radius);
    padding: 10px;
    box-shadow: inset 0 1px 3px rgba(30, 15, 5, 0.1);
    outline: none;
    font-size: inherit;
    font-family: inherit;
    color: var(--primary);
    transition: border-color 0.3s ease, box-shadow 0.3s ease;

    &:focus {
      border-color: var(--border-accent);
      box-shadow: inset 0 1px 3px rgba(30, 15, 5, 0.1), 0 0 8px var(--glow-warm-soft);
    }
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
