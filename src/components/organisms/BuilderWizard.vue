<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useRouter } from "vue-router";
import { useBuilderWizard } from "../pages/composables/useBuilderWizard";
import { useMapDraft } from "../../data/builder/draft";
import WfcDialog from "./WfcDialog.vue";
import TerrainPaintDialog from "./TerrainPaintDialog.vue";
import AiAlignDialog from "./AiAlignDialog.vue";
import MapSelect from "./MapSelect.vue";
import ImageInput from "../molecules/ImageInput.vue";
import BuilderDescription from "../molecules/BuilderDescription.vue";
import BuildDialog from "../molecules/BuildDialog.vue";
import Collapsible from "../atoms/Collapsible.vue";
import TornPanel from "../atoms/TornPanel.vue";
import IconButton from "../atoms/IconButton.vue";
import close from "pixelarticons/svg/close.svg";
import autoMapIcon from "pixelarticons/svg/shuffle.svg";
import autoTerrainIcon from "pixelarticons/svg/magic-edit.svg";
import manualIcon from "pixelarticons/svg/image-new.svg";
import type { LadderInfo } from "../../data/wfc/postProcess";
import type { Config } from "../../data/map";
import { runWfc, type WfcSettings } from "../../data/wfc/runWfc";

const router = useRouter();
const { screen, visible, selectPath, next, back, close: closeWizard } =
  useBuilderWizard();
const draft = useMapDraft();

const TITLES: Partial<Record<string, string>> = {
  choose: "Create a map",
  "autoTerrain-preview": "Add terrain",
  "manual-terrain": "Add your terrain",
  "manual-background": "Add a background",
  "manual-advanced": "Finalize map",
};
const title = computed(() => TITLES[screen.value] ?? "");

const wfcSettings = ref<WfcSettings>({
  width: 10, height: 4, density: 60,
  continuityBonus: 2, preventBlockages: true,
  densityMask: null,
});
const wfcLadders = ref<LadderInfo[]>([]);

const goToBuilder = () => {
  router.push("/builder");
  closeWizard();
};

const goBack = () => {
  if (!back()) closeWizard();
};

// Each "create" path starts a brand-new map, so clear any map left over from a
// previously loaded/built session before entering the path. (The Load card
// repopulates the draft via loadConfig, so it doesn't go through here.)
const startPath = (p: "autoMap" | "autoTerrain" | "manual") => {
  draft.reset();
  selectPath(p);
};

const handleWfcGenerated = (maskData: string, ladders: LadderInfo[]) => {
  wfcLadders.value = ladders;
  draft.applyWfc(maskData, ladders);
  next();
};

const buildOpen = ref(false);

const wfcGenerating = ref(false);
const wfcError = ref("");
let activeWorker: Worker | null = null;

// Regenerate the wallmask in place (the `g` shortcut). Errors surface in the
// status banner instead of being swallowed.
const regenerateWfc = () => {
  if (wfcGenerating.value) return;
  wfcGenerating.value = true;
  wfcError.value = "";
  const { promise, worker } = runWfc(wfcSettings.value);
  activeWorker = worker;
  promise
    .then(({ mask, ladders }) => {
      wfcLadders.value = ladders;
      draft.applyWfc(mask, ladders);
    })
    .catch((err: Error) => (wfcError.value = err.message))
    .finally(() => {
      wfcGenerating.value = false;
      activeWorker = null;
    });
};

const aiFileInput = ref<HTMLInputElement>();
const aiAlignSrc = ref("");
const showAiAlign = ref(false);

function buildAIPrompt(wpx: number, hpx: number): string {
  return `Generate an image of a 2D side-view game terrain based on the attached black-and-white mask image. In the mask, black areas represent solid terrain and white areas represent empty sky or background.\n\nThe output image must be exactly ${wpx}x${hpx} pixels — the same dimensions as the input mask.\n\nCreate a textured terrain image that follows these rules:\n- The solid black areas should become detailed, textured <theme> terrain. Add surface detail, shading, and depth to make it look like a painted game environment.\n- The white empty areas should become a distinct, clearly different background — use a lighter sky or atmospheric background that is obviously not terrain. The background must have no transparency.\n- The boundary between terrain and background must be clearly visible with good contrast.\n- Keep the exact same dimensions and shape as the input mask. Do not add, remove, or reshape any terrain. Every black pixel must remain solid, every white pixel must remain background.\n- If there are brown rectangular areas in the image, these indicate ladder positions. Draw wooden ladders on these brown areas. The ladders should look like climbable wooden game ladders with rungs.\n- The output must be a fully opaque image with no transparency anywhere.\n- Use a pixel art or hand-painted 2D game art style.\n- This is a side-scrolling game map, so add appropriate environmental details like grass on top edges, rocky textures on sides, and darker shading underneath overhangs.`;
}

const handleExportMaskForAI = () => {
  if (!draft.mask.value.data) return;
  const image = new Image();
  image.src = draft.mask.value.data;
  image.onload = () => {
    const src = new OffscreenCanvas(image.width, image.height);
    const srcCtx = src.getContext("2d")!;
    srcCtx.drawImage(image, 0, 0);
    const dst = new OffscreenCanvas(image.width, image.height);
    const dstCtx = dst.getContext("2d")!;
    dstCtx.fillStyle = "#ffffff";
    dstCtx.fillRect(0, 0, image.width, image.height);
    if (wfcLadders.value.length > 0) {
      dstCtx.fillStyle = "#8B4513";
      for (const ladder of wfcLadders.value) {
        dstCtx.fillRect(ladder.x - ladder.width / 2, ladder.y, ladder.width, ladder.height);
      }
    }
    const srcData = srcCtx.getImageData(0, 0, image.width, image.height);
    const dstData = dstCtx.getImageData(0, 0, image.width, image.height);
    for (let i = 0; i < srcData.data.length; i += 4) {
      if (srcData.data[i + 3] > 128) {
        dstData.data[i] = 0; dstData.data[i + 1] = 0; dstData.data[i + 2] = 0; dstData.data[i + 3] = 255;
      }
    }
    dstCtx.putImageData(dstData, 0, 0);
    navigator.clipboard.writeText(buildAIPrompt(image.width, image.height));
    dst.convertToBlob({ type: "image/png" }).then((blob) => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.download = `${draft.name.value || "mask"}-ai.png`;
      link.href = url;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
  };
};

const handleImportClick = () => aiFileInput.value?.click();
const handleAiFile = (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file || !draft.mask.value.data) return;
  const reader = new FileReader();
  reader.onload = () => {
    aiAlignSrc.value = reader.result as string;
    showAiAlign.value = true;
  };
  reader.readAsDataURL(file);
  (event.target as HTMLInputElement).value = "";
};
const handleAiAlignConfirm = (result: {
  terrain: string; background: string; mask: string; width: number; height: number;
}) => {
  draft.applyAiAlign(result);
  showAiAlign.value = false;
  goToBuilder();
};

const handleAddTerrain = (_: File, data: string) => {
  draft.setTerrainImage(data);
  next();
};
const handleAddBackground = (_: File, data: string) => {
  draft.setBackgroundImage(data);
  next();
};

const handlePaintConfirm = (result: {
  terrain: string; background: string; width: number; height: number;
}) => {
  draft.applyPaint(result);
  goToBuilder();
};

const handleLoad = (config: Config, name: string) => {
  draft.loadConfig(config, name);
  goToBuilder();
};

const handleBuild = () => {
  buildOpen.value = true;
};

const handleKeydown = (e: KeyboardEvent) => {
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
  if (
    visible.value &&
    (screen.value === "autoMap-paint" || screen.value === "autoTerrain-preview") &&
    (e.key === "g" || e.key === "G")
  ) {
    regenerateWfc();
  }
};
onMounted(() => window.addEventListener("keydown", handleKeydown));
onUnmounted(() => {
  window.removeEventListener("keydown", handleKeydown);
  if (activeWorker) { activeWorker.terminate(); activeWorker = null; }
});
</script>

<template>
  <template v-if="visible">
    <!-- persistent dim so transitioning between panel screens and the modal
         dialogs never leaves an undimmed frame (no background flash) -->
    <div class="wizard-dim" />

    <!-- pinned to the top so it stays visible above the centred paint/preview
         screens while regenerating with `g` -->
    <div
      v-if="
        (screen === 'autoMap-paint' || screen === 'autoTerrain-preview') &&
        (wfcGenerating || wfcError)
      "
      :class="{ 'wfc-status': true, 'wfc-status--error': !!wfcError }"
    >
      <span v-if="wfcGenerating" class="spinner-row">
        <span class="spinner">&#x07F7;</span> Regenerating wallmask...
      </span>
      <span v-else>{{ wfcError }}</span>
    </div>

    <WfcDialog
      v-if="screen === 'autoMap-wfc' || screen === 'autoTerrain-wfc'"
      :settings="wfcSettings"
      :onGenerate="handleWfcGenerated"
      :onClose="closeWizard"
      :onBack="goBack"
    />
    <TerrainPaintDialog
      v-else-if="screen === 'autoMap-paint'"
      :alphaSrc="draft.mask.value.data || draft.terrain.value.data"
      :ladders="draft.ladders.value.map((l) => l.toJS())"
      :onConfirm="handlePaintConfirm"
      :onClose="closeWizard"
      :onBack="goBack"
    />

    <div v-else class="wizard-overlay">
      <div class="wizard-panel">
        <TornPanel>
          <div class="wizard-head">
            <h2>{{ title }}</h2>
            <IconButton title="Close" :onClick="closeWizard" :icon="close" />
          </div>
          <div class="wizard-body">
            <template v-if="screen === 'choose'">
              <div class="cards">
                <button class="card" @click="startPath('autoMap')">
                  <h3>Autogenerate map</h3>
                  <p class="sub">Generate a wallmask and paint terrain over it.</p>
                  <img class="card-icon" :src="autoMapIcon" alt="" />
                </button>
                <button class="card" @click="startPath('autoTerrain')">
                  <h3>Autogenerate terrain</h3>
                  <p class="sub">Generate a wallmask, then build the terrain yourself.</p>
                  <img class="card-icon" :src="autoTerrainIcon" alt="" />
                </button>
                <button class="card" @click="startPath('manual')">
                  <h3>Create map manually</h3>
                  <p class="sub">Upload your own terrain and background images.</p>
                  <img class="card-icon" :src="manualIcon" alt="" />
                </button>
                <div class="card card--select">
                  <h3>Load map</h3>
                  <p class="sub">Open an existing map to edit.</p>
                  <MapSelect compact :onEdit="handleLoad" class="load-select" />
                </div>
              </div>
            </template>

            <template v-else-if="screen === 'autoTerrain-preview'">
              <div class="preview-frame">
                <img v-if="draft.mask.value.data" :src="draft.mask.value.data" class="mask-preview" />
              </div>
              <p class="sub">
                Export the mask to paint terrain in an external AI tool, then import
                the result to finish your map.
              </p>
              <input ref="aiFileInput" hidden type="file" accept="image/*" @change="handleAiFile" />
              <div class="actions">
                <button class="secondary" @click="goBack">Back</button>
                <button class="secondary" @click="handleExportMaskForAI">Export mask for AI</button>
                <button class="primary" @click="handleImportClick">Import AI terrain</button>
              </div>
            </template>

            <template v-else-if="screen === 'manual-terrain'">
              <div class="description"><BuilderDescription topic="terrain" /></div>
              <ImageInput name="Terrain" :modelValue="draft.terrain.value.data" :onAdd="handleAddTerrain" />
              <div class="actions">
                <button class="secondary" @click="goBack">Back</button>
              </div>
            </template>

            <template v-else-if="screen === 'manual-background'">
              <div class="description"><BuilderDescription topic="background" /></div>
              <ImageInput name="Background" :modelValue="draft.background.value.data" :onAdd="handleAddBackground" />
              <div class="actions">
                <button class="secondary" @click="goBack">Back</button>
                <button class="primary" @click="next">Skip</button>
              </div>
            </template>

            <template v-else-if="screen === 'manual-advanced'">
              <Collapsible title="Advanced settings">
                <div class="advanced-scroll">
                  <div class="description">
                    <BuilderDescription topic="advanced" />
                    <h4>Wallmask</h4>
                    <BuilderDescription topic="wallmask" />
                    <h4>Overlays</h4>
                    <BuilderDescription topic="overlays" />
                  </div>
                </div>
              </Collapsible>
              <div class="actions">
                <button class="secondary" @click="goBack">Back</button>
                <button class="primary" @click="handleBuild">Build</button>
                <button class="primary" @click="goToBuilder">Continue in builder</button>
              </div>
            </template>
          </div>
        </TornPanel>
      </div>
    </div>

    <AiAlignDialog
      v-if="showAiAlign"
      :maskSrc="draft.mask.value.data"
      :aiSrc="aiAlignSrc"
      :onConfirm="handleAiAlignConfirm"
      :onClose="() => (showAiAlign = false)"
    />
    <BuildDialog :open="buildOpen" :onClose="() => (buildOpen = false)" />
  </template>
</template>

<style lang="scss" scoped>
.wizard-dim {
  position: fixed;
  inset: 0;
  z-index: 99;
  background: rgba(0, 0, 0, 0.5);
}

.wfc-status {
  position: fixed;
  top: 12px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 101;
  padding: 6px 14px;
  border-radius: var(--small-radius);
  background: var(--field-bg);
  border: 2px solid var(--border-accent-faint);
  font-size: 14px;

  &--error {
    color: var(--highlight);
    border-color: var(--highlight);
  }

  .spinner-row {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
}

.wizard-overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.wizard-panel {
  // shrink-wrap to the shared body width (+ panel chrome) so it matches the dialogs
  width: auto;
  max-width: 100%;
}

.wizard-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  margin-right: -10px;
}

/* fixed size so every wizard screen matches the wfc/paint dialogs */
.wizard-body {
  width: var(--wizard-body-width);
  height: var(--wizard-body-height);
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.cards {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-auto-rows: 1fr;
  gap: 12px;
}

.card {
  display: flex;
  flex-direction: column;
  text-align: left;
  padding: 14px;
  background: var(--field-bg);
  border: 2px solid var(--border-accent-faint);
  border-radius: var(--small-radius);
  cursor: pointer;
  transition: border-color 0.3s ease, box-shadow 0.3s ease;

  h3 { margin: 0 0 6px; }

  &:not(.card--select):hover {
    border-color: var(--border-accent);
    box-shadow: 2px 2px 0 var(--shadow-hard), 0 0 8px var(--glow-warm-soft);
  }
}

.card-icon {
  // center in the leftover space below the text
  margin: auto;
  width: 72px;
  height: 72px;
  opacity: 0.22;
  image-rendering: pixelated;
}

.card--select {
  cursor: default;

  // the load option is a single full-width select filling the card width; the
  // compact MapSelect already strips its panel framing
  :deep(.map-select--compact) {
    margin-top: auto;
    width: 100%;
  }

  :deep(.custom-select),
  :deep(select) {
    width: 100%;
  }
}

.sub {
  font-family: system-ui;
  font-size: 14px;
  line-height: 1.35;
  opacity: 0.8;
  letter-spacing: 0;
}

.preview-frame {
  border: 1px solid var(--border-accent-faint);
  border-radius: var(--small-radius);
  overflow: auto;
  max-height: 220px;

  .mask-preview {
    display: block;
    image-rendering: pixelated;
    width: 100%;
    background: repeating-conic-gradient(#ccc 0% 25%, #eee 0% 50%) 0 0 / 16px 16px;
  }
}

.description img { image-rendering: pixelated; vertical-align: middle; }

.advanced-scroll {
  max-height: 240px;
  overflow: auto;
}

.actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: auto;

  // back button pinned left, primary actions to the right
  > :first-child {
    margin-right: auto;
  }
}
</style>
