<script setup lang="ts">
import { ref, watch } from "vue";
import Dialog from "../molecules/Dialog.vue";

const PREVIEW_SCALE = 6;

const props = defineProps<{
  maskSrc: string;
  aiSrc: string;
  onConfirm: (result: {
    terrain: string;
    background: string;
    mask: string;
    width: number;
    height: number;
  }) => void;
  onClose: () => void;
}>();

const offsetX = ref(0);
const offsetY = ref(0);
const scaleX = ref(100);
const scaleY = ref(100);

const maskImg = ref<HTMLImageElement>();
const aiImg = ref<HTMLImageElement>();
const maskLoaded = ref(false);
const aiLoaded = ref(false);

watch(
  () => props.maskSrc,
  (src) => {
    const img = new Image();
    img.onload = () => {
      maskImg.value = img;
      maskLoaded.value = true;
    };
    img.src = src;
  },
  { immediate: true }
);

watch(
  () => props.aiSrc,
  (src) => {
    const img = new Image();
    img.onload = () => {
      aiImg.value = img;
      aiLoaded.value = true;
    };
    img.src = src;
  },
  { immediate: true }
);

const previewCanvas = ref<HTMLCanvasElement>();

watch(
  [maskLoaded, aiLoaded, offsetX, offsetY, scaleX, scaleY, previewCanvas],
  () => {
    const canvas = previewCanvas.value;
    const mi = maskImg.value;
    const ai = aiImg.value;
    if (!canvas || !mi || !ai) return;

    canvas.width = mi.width * PREVIEW_SCALE;
    canvas.height = mi.height * PREVIEW_SCALE;
    const ctx = canvas.getContext("2d")!;
    ctx.imageSmoothingEnabled = false;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw AI image with offset and scale
    const sx = scaleX.value / 100;
    const sy = scaleY.value / 100;
    const aiW = mi.width * sx;
    const aiH = mi.height * sy;
    ctx.drawImage(
      ai,
      offsetX.value * PREVIEW_SCALE,
      offsetY.value * PREVIEW_SCALE,
      aiW * PREVIEW_SCALE,
      aiH * PREVIEW_SCALE
    );

    // Draw mask outline on top (semi-transparent)
    ctx.globalAlpha = 0.4;
    ctx.drawImage(mi, 0, 0, mi.width * PREVIEW_SCALE, mi.height * PREVIEW_SCALE);
    ctx.globalAlpha = 1;
  },
  { immediate: true }
);

function handleConfirm() {
  const mi = maskImg.value;
  const ai = aiImg.value;
  if (!mi || !ai) return;

  const sx = scaleX.value / 100;
  const sy = scaleY.value / 100;
  const aiW = Math.round(mi.width * sx);
  const aiH = Math.round(mi.height * sy);
  const ox = offsetX.value;
  const oy = offsetY.value;

  // Compute shared region (intersection of mask rect and offset AI rect)
  const x0 = Math.max(0, ox);
  const y0 = Math.max(0, oy);
  const x1 = Math.min(mi.width, ox + aiW);
  const y1 = Math.min(mi.height, oy + aiH);
  const cropW = x1 - x0;
  const cropH = y1 - y0;
  if (cropW <= 0 || cropH <= 0) return;

  // Draw full cropped AI image
  const aiCanvas = new OffscreenCanvas(cropW, cropH);
  const aCtx = aiCanvas.getContext("2d")!;
  aCtx.drawImage(ai, 0, 0, ai.width, ai.height, ox - x0, oy - y0, aiW, aiH);
  const aiData = aCtx.getImageData(0, 0, cropW, cropH);

  // Draw cropped mask
  const maskCanvas = new OffscreenCanvas(cropW, cropH);
  const mCtx = maskCanvas.getContext("2d")!;
  mCtx.drawImage(mi, x0, y0, cropW, cropH, 0, 0, cropW, cropH);
  const maskData = mCtx.getImageData(0, 0, cropW, cropH).data;

  // Terrain: only mask-overlapping pixels, rest transparent
  const terrainCanvas = new OffscreenCanvas(cropW, cropH);
  const tCtx = terrainCanvas.getContext("2d")!;
  const terrainImgData = tCtx.createImageData(cropW, cropH);
  const td = terrainImgData.data;
  const ad = aiData.data;

  for (let i = 0; i < ad.length; i += 4) {
    if (maskData[i + 3] > 128) {
      td[i] = ad[i];
      td[i + 1] = ad[i + 1];
      td[i + 2] = ad[i + 2];
      td[i + 3] = ad[i + 3];
    }
  }
  tCtx.putImageData(terrainImgData, 0, 0);

  // Background: full image desaturated, mask areas desaturated 3x more
  const bgCanvas = new OffscreenCanvas(cropW, cropH);
  const bCtx = bgCanvas.getContext("2d")!;
  const bgImgData = bCtx.createImageData(cropW, cropH);
  const bd = bgImgData.data;
  const bgMix = 0.3;
  const fgMix = 0.7;

  for (let i = 0; i < ad.length; i += 4) {
    const gray = ad[i] * 0.3 + ad[i + 1] * 0.59 + ad[i + 2] * 0.11;
    const onMask = maskData[i + 3] > 128;
    if (onMask) {
      // Mask areas: nearly white washed-out look
      bd[i] = Math.round(gray + (255 - gray) * 0.4);
      bd[i + 1] = Math.round(gray + (255 - gray) * 0.4);
      bd[i + 2] = Math.round(gray + (255 - gray) * 0.4);
    } else {
      // Non-mask areas: light desaturation
      bd[i] = Math.round(ad[i] + (gray - ad[i]) * bgMix);
      bd[i + 1] = Math.round(ad[i + 1] + (gray - ad[i + 1]) * bgMix);
      bd[i + 2] = Math.round(ad[i + 2] + (gray - ad[i + 2]) * bgMix);
    }
    bd[i + 3] = 255;
  }
  bCtx.putImageData(bgImgData, 0, 0);

  Promise.all([
    terrainCanvas.convertToBlob({ type: "image/png" }),
    bgCanvas.convertToBlob({ type: "image/png" }),
    maskCanvas.convertToBlob({ type: "image/png" }),
  ]).then(([terrainBlob, bgBlob, maskBlob]) => {
    const readers = [new FileReader(), new FileReader(), new FileReader()];
    const urls: string[] = ["", "", ""];
    let done = 0;
    const finish = () => {
      if (++done < 3) return;
      props.onConfirm({
        terrain: urls[0],
        background: urls[1],
        mask: urls[2],
        width: cropW,
        height: cropH,
      });
    };
    [terrainBlob, bgBlob, maskBlob].forEach((blob, idx) => {
      readers[idx].onload = () => {
        urls[idx] = readers[idx].result as string;
        finish();
      };
      readers[idx].readAsDataURL(blob);
    });
  });
}
</script>

<template>
  <Dialog open :onClose="onClose" title="Align AI terrain">
    <div class="align-dialog">
      <div class="preview-scroll">
        <canvas ref="previewCanvas" class="preview" />
      </div>

      <div class="controls">
        <label class="control">
          <span>X offset</span>
          <input type="range" v-model.number="offsetX" :min="-200" :max="200" />
          <input type="number" v-model.number="offsetX" class="num" />
        </label>
        <label class="control">
          <span>Y offset</span>
          <input type="range" v-model.number="offsetY" :min="-200" :max="200" />
          <input type="number" v-model.number="offsetY" class="num" />
        </label>
        <label class="control">
          <span>X scale</span>
          <input type="range" v-model.number="scaleX" :min="50" :max="150" />
          <input type="number" v-model.number="scaleX" class="num" />
          <span>%</span>
        </label>
        <label class="control">
          <span>Y scale</span>
          <input type="range" v-model.number="scaleY" :min="50" :max="150" />
          <input type="number" v-model.number="scaleY" class="num" />
          <span>%</span>
        </label>
      </div>

      <div class="actions">
        <button class="primary" @click="handleConfirm">Confirm</button>
        <button class="secondary" @click="onClose">Cancel</button>
      </div>
    </div>
  </Dialog>
</template>

<style lang="scss" scoped>
.align-dialog {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 400px;
}

.preview-scroll {
  max-width: 500px;
  max-height: 300px;
  overflow: auto;
  border: 1px solid var(--border-accent-faint);
  border-radius: 4px;
  scrollbar-color: var(--background-dark) transparent;
  scrollbar-width: thin;
}

.preview {
  image-rendering: pixelated;
  background: repeating-conic-gradient(#ccc 0% 25%, #eee 0% 50%) 0 0 / 16px 16px;
}

.controls {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.control {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--primary);

  span:first-child {
    min-width: 55px;
  }

  input[type="range"] {
    flex: 1;
    accent-color: var(--primary);
  }

  .num {
    width: 50px;
    padding: 2px 4px;
    font-size: 12px;
    background: rgba(0, 0, 0, 0.1);
    border: 1px solid var(--border-accent-faint);
    border-radius: 3px;
    color: var(--primary);
    text-align: right;
  }
}

.actions {
  display: flex;
  gap: 8px;
  margin-top: 4px;
}
</style>
