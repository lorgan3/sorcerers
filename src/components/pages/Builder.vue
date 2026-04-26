<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from "vue";
import { Map, Config, Layer } from "../../data/map";
import Input from "../atoms/Input.vue";
import BoundingBox from "../molecules/BoundingBox.vue";
import { BBox } from "../../data/map/bbox";
import { useRouter } from "vue-router";
import { GameSettings } from "../../util/localStorage/settings";
import MapSelect from "../organisms/MapSelect.vue";
import BuilderSettings, {
  AdvancedSettings,
} from "../organisms/BuilderSettings.vue";
import ImageInput from "../molecules/ImageInput.vue";
import IconButton from "../atoms/IconButton.vue";
import plus from "pixelarticons/svg/plus.svg";
import dice from "pixelarticons/svg/dice.svg";
import download from "pixelarticons/svg/download.svg";
import upload from "pixelarticons/svg/upload.svg";
import Collapsible from "../atoms/Collapsible.vue";
import WfcDialog, { type WfcSettings } from "../organisms/WfcDialog.vue";
import AiAlignDialog from "../organisms/AiAlignDialog.vue";
import type { LadderInfo } from "../../data/wfc/postProcess";
import WfcWorker from "../../data/wfc/wfc.worker?worker";
import { useBuilderLayers } from "./composables/useBuilderLayers";
import { useBuilderLadders } from "./composables/useBuilderLadders";
import { useBuilderMap } from "./composables/useBuilderMap";

const { onPlay, config } = defineProps<{
  onPlay: (key: string, map: Map | Config, settings: GameSettings) => void;
  config?: Config;
}>();
const router = useRouter();
const preview = ref<HTMLDivElement>();

const name = ref("");

const settingsOpen = ref(false);
const advancedSettings = ref<AdvancedSettings>({
  scale: 6,
  bbox: BBox.create(0, 0),
  customMask: false,
  parallaxName: "",
  parallaxOffset: 0,
});

const oldScale = ref(advancedSettings.value.scale);

const {
  terrain, mask, background, layers,
  handleAddTerrain, handleSetTerrainVisibility,
  handleAddMask, handleSetMaskVisibility,
  handleAddBackground, handleSetBackgroundVisibility,
  handleAddLayer, handleRemoveLayer, handleSetLayerVisibility,
} = useBuilderLayers(advancedSettings, preview);

const { ladders, creatingLadder, handleCreateLadder } =
  useBuilderLadders(advancedSettings, preview);

const { handleBuild, handleTest, loadMap } = useBuilderMap(
  name, terrain, mask, background, layers, ladders, advancedSettings, oldScale
);

onMounted(async () => {
  if (config) {
    loadMap(config, "");
  }
});

watch(
  () => advancedSettings.value.customMask,
  (useMask) => {
    if (!useMask) {
      mask.value = { data: "", visible: false };
    }
  }
);

const showWfcDialog = ref(false);
const wfcSettings = ref<WfcSettings>({
  width: 10,
  height: 4,
  density: 60,
  edgeTop: 25,
  edgeBottom: 75,
  edgeLeft: 0,
  edgeRight: 0,
  continuityBonus: 2,
  preventBlockages: true,
  densityMode: "edges",
  densityMask: null,
  densityImageData: "",
});

const wfcLadders = ref<LadderInfo[]>([]);

const wfcGenerating = ref(false);
const wfcInitialError = ref<string>("");
let activeWorker: Worker | null = null;

const generateWfc = () => {
  if (wfcGenerating.value) return;
  wfcGenerating.value = true;
  const s = wfcSettings.value;
  const worker = new WfcWorker();
  activeWorker = worker;

  const finish = (errMessage?: string) => {
    wfcGenerating.value = false;
    activeWorker = null;
    worker.terminate();
    if (errMessage) {
      wfcInitialError.value = errMessage;
      showWfcDialog.value = true;
    }
  };

  worker.postMessage({
    width: s.width,
    height: s.height,
    density: s.density / 100,
    edges: {
      top: s.edgeTop / 100,
      bottom: s.edgeBottom / 100,
      left: s.edgeLeft / 100,
      right: s.edgeRight / 100,
    },
    continuityBonus: s.continuityBonus,
    preventBlockages: s.preventBlockages,
    ...(s.densityMode === "image" && s.densityMask
      ? { densityMask: s.densityMask }
      : {}),
  });
  worker.onmessage = (e: MessageEvent) => {
    if (e.data.type === "progress") return;
    if (e.data.success && e.data.mask) {
      finish();
      handleWfcGenerated(e.data.mask, e.data.ladders ?? []);
    } else {
      finish(e.data.error ?? "Generation failed.");
    }
  };
  worker.onerror = () => finish("An unexpected error occurred.");
};

const handleKeydown = (e: KeyboardEvent) => {
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
  if (showWfcDialog.value || showAiAlign.value) return;
  if (e.key === "g" || e.key === "G") {
    generateWfc();
  }
};
onMounted(() => window.addEventListener("keydown", handleKeydown));
onUnmounted(() => {
  window.removeEventListener("keydown", handleKeydown);
  if (activeWorker) {
    activeWorker.terminate();
    activeWorker = null;
  }
});

const handleWfcGenerated = (maskData: string, wfcLadderData: LadderInfo[]) => {
  mask.value = { data: maskData, visible: true };
  advancedSettings.value.customMask = true;
  showWfcDialog.value = false;
  wfcLadders.value = wfcLadderData;

  // Clear existing ladders and overlays
  ladders.value = [];
  layers.value = [];

  // Add WFC-generated ladders to the builder
  for (const ladder of wfcLadderData) {
    ladders.value.push(
      new BBox(
        ladder.x - ladder.width / 2,
        ladder.y,
        ladder.x + ladder.width / 2,
        ladder.y + ladder.height,
      ),
    );
  }

  const image = new Image();
  image.src = maskData;
  image.onload = () => {
    advancedSettings.value.bbox = BBox.create(image.width, image.height);
  };
};

function buildAIPrompt(w: number, h: number): string {
  return `Generate an image of a 2D side-view game terrain based on the attached black-and-white mask image. In the mask, black areas represent solid terrain and white areas represent empty sky or background.

The output image must be exactly ${w}x${h} pixels — the same dimensions as the input mask.

Create a textured terrain image that follows these rules:
- The solid black areas should become detailed, textured <theme> terrain. Add surface detail, shading, and depth to make it look like a painted game environment.
- The white empty areas should become a distinct, clearly different background — use a lighter sky or atmospheric background that is obviously not terrain. The background must have no transparency.
- The boundary between terrain and background must be clearly visible with good contrast.
- Keep the exact same dimensions and shape as the input mask. Do not add, remove, or reshape any terrain. Every black pixel must remain solid, every white pixel must remain background.
- If there are brown rectangular areas in the image, these indicate ladder positions. Draw wooden ladders on these brown areas. The ladders should look like climbable wooden game ladders with rungs.
- The output must be a fully opaque image with no transparency anywhere.
- Use a pixel art or hand-painted 2D game art style.
- This is a side-scrolling game map, so add appropriate environmental details like grass on top edges, rocky textures on sides, and darker shading underneath overhangs.`;
}

const handleExportMaskForAI = () => {
  if (!mask.value.data) return;

  const image = new Image();
  image.src = mask.value.data;
  image.onload = () => {
    const src = new OffscreenCanvas(image.width, image.height);
    const srcCtx = src.getContext("2d")!;
    srcCtx.drawImage(image, 0, 0);

    // Build export canvas: brown ladder rectangles behind the mask
    const dst = new OffscreenCanvas(image.width, image.height);
    const dstCtx = dst.getContext("2d")!;

    // Start with white background
    dstCtx.fillStyle = "#ffffff";
    dstCtx.fillRect(0, 0, image.width, image.height);

    // Draw brown rectangles at ladder positions
    if (wfcLadders.value.length > 0) {
      dstCtx.fillStyle = "#8B4513";
      for (const ladder of wfcLadders.value) {
        dstCtx.fillRect(
          ladder.x - ladder.width / 2,
          ladder.y,
          ladder.width,
          ladder.height,
        );
      }
    }

    // Draw mask on top: solid terrain = black, transparent areas show what's beneath
    const srcData = srcCtx.getImageData(0, 0, image.width, image.height);
    const dstData = dstCtx.getImageData(0, 0, image.width, image.height);
    const srcPixels = srcData.data;
    const dstPixels = dstData.data;

    for (let i = 0; i < srcPixels.length; i += 4) {
      const solid = srcPixels[i + 3] > 128;
      if (solid) {
        // Solid terrain = black, overwriting whatever was beneath
        dstPixels[i] = 0;
        dstPixels[i + 1] = 0;
        dstPixels[i + 2] = 0;
        dstPixels[i + 3] = 255;
      }
      // Non-solid areas keep whatever was drawn (white or brown)
    }

    dstCtx.putImageData(dstData, 0, 0);

    // Copy prompt to clipboard with exact dimensions
    navigator.clipboard.writeText(buildAIPrompt(image.width, image.height));

    dst.convertToBlob({ type: "image/png" }).then((blob) => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.download = `${name.value || "mask"}-ai.png`;
      link.href = url;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
  };
};

const aiTerrainInput = ref<HTMLInputElement>();

const handleImportAITerrain = () => {
  aiTerrainInput.value?.click();
};

const aiAlignSrc = ref("");
const showAiAlign = ref(false);

const handleAITerrainFile = (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file || !mask.value.data) return;

  const reader = new FileReader();
  reader.onload = () => {
    aiAlignSrc.value = reader.result as string;
    showAiAlign.value = true;
  };
  reader.readAsDataURL(file);
  (event.target as HTMLInputElement).value = "";
};

const handleAiAlignConfirm = (result: {
  terrain: string;
  background: string;
  mask: string;
  width: number;
  height: number;
}) => {
  terrain.value = { data: result.terrain, visible: true };
  background.value = { data: result.background, visible: true };
  mask.value = { data: result.mask, visible: false };
  advancedSettings.value.bbox = BBox.create(result.width, result.height);
  showAiAlign.value = false;
};

watch(
  () => advancedSettings.value.scale,
  (scale) => {
    ladders.value = ladders.value.map((ladder) =>
      ladder.withScale(scale / oldScale.value)
    );
    oldScale.value = scale;
  }
);

const handleMouseDown = (event: MouseEvent, layer: Layer) => {
  let x = layer.x;
  let y = layer.y;
  let startX = event.pageX;
  let startY = event.pageY;

  const handleMouseMove = (moveEvent: MouseEvent) => {
    layer.x =
      x + Math.round((moveEvent.pageX - startX) / advancedSettings.value.scale);
    layer.y =
      y + Math.round((moveEvent.pageY - startY) / advancedSettings.value.scale);
  };

  const handleMouseUp = () => {
    document.onselectstart = null;
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
  };

  event.preventDefault();
  document.onselectstart = () => false;
  document.addEventListener("mousemove", handleMouseMove);
  document.addEventListener("mouseup", handleMouseUp);
};

const handleBBoxChange = (newBBox: BBox) => {
  advancedSettings.value.bbox = newBBox;
};
</script>

<template>
  <div class="builder" :style="{ '--scale': advancedSettings.scale }">
    <section class="controls flex-list">
      <Input label="Name" autofocus v-model="name" />
      <div class="section">
        <h2>
          Terrain
          <span v-if="wfcGenerating" class="spinner wfc-generating" title="Generating...">&#x07F7;</span>
          <IconButton
            v-else
            title="Generate wallmask"
            :onClick="() => { wfcInitialError = ''; showWfcDialog = true; }"
            :icon="dice"
          />
          <IconButton
            v-if="mask.data"
            title="Export mask for AI (copies prompt to clipboard)"
            :onClick="handleExportMaskForAI"
            :icon="download"
          />
          <IconButton
            v-if="mask.data"
            title="Import AI-generated terrain"
            :onClick="handleImportAITerrain"
            :icon="upload"
          />
          <input
            ref="aiTerrainInput"
            hidden
            type="file"
            accept="image/*"
            @change="handleAITerrainFile"
          />
        </h2>
        <ImageInput
          name="Terrain"
          :onAdd="handleAddTerrain"
          v-model="terrain.data"
          :onToggleVisibility="handleSetTerrainVisibility"
          clearable
        />
        <div v-if="advancedSettings.customMask" class="mask-row">
          <ImageInput
            name="Mask"
            :onAdd="handleAddMask"
            v-model="mask.data"
            :onToggleVisibility="handleSetMaskVisibility"
            clearable
            :defaultHidden="!mask.visible"
          />
        </div>
        <ImageInput
          name="Background"
          :onAdd="handleAddBackground"
          v-model="background.data"
          :onToggleVisibility="handleSetBackgroundVisibility"
          clearable
        />
      </div>

      <div class="section">
        <h2>
          Overlays
          <IconButton
            title="Add layer"
            :onClick="handleAddLayer"
            :icon="plus"
          />
        </h2>
        <div v-for="(layer, i) in layers" class="section">
          <ImageInput
            :name="`Layer ${i}`"
            :onClear="() => handleRemoveLayer(i)"
            v-model="(layer.data as string)"
            :onToggleVisibility="(visible: boolean) => handleSetLayerVisibility(visible, i)"
            clearable
          />
        </div>
      </div>

      <div class="section">
        <h2>
          Ladders {{ ladders.length ? `(${ladders.length})` : "" }}
          <IconButton
            title="Add ladder"
            :onClick="() => (creatingLadder = true)"
            :icon="plus"
          />
        </h2>
      </div>

      <div class="section">
        <button class="secondary" @click="settingsOpen = true">
          Adv. settings
        </button>
        <BuilderSettings
          v-if="settingsOpen"
          :settings="advancedSettings"
          :onClose="() => (settingsOpen = false)"
        />
      </div>

      <button
        class="primary"
        title="Build and save map to file system"
        @click="handleBuild"
      >
        Build
      </button>
      <button class="primary" title="Build and test" @click="() => handleTest(onPlay)">
        Test
      </button>
      <button class="secondary" @click="() => router.replace('/')">Back</button>
    </section>
    <section
      :class="{ preview: true, 'add-ladder': creatingLadder }"
      ref="preview"
      @mousedown="handleCreateLadder"
    >
      <div v-if="!terrain.data && !background.data && !mask.data" class="description">
        <p>
          Building your own maps is very easy thanks to the builder. Only a
          terrain image is needed to start testing! All configuration options
          are explained below. If something is not clear, consider making an
          <a
            href="https://github.com/lorgan3/sorcerers/issues"
            target="_blank"
            rel="noopener noreferrer"
            >issue on GitHub</a
          >. If you just want to quickly have a look at an existing map you can
          do so here:
        </p>
        <MapSelect :onEdit="loadMap" />

        <div class="section">
          <Collapsible title="Terrain">
            <p>
              A map needs at least a terrain to be playable. The terrain is the
              layer that can be blown up and by default this is what the
              sorcerers stand on. At the default scale (6x6), a character is 6
              pixels wide and 16 pixels high. They can jump about 21 pixels
              high. You can use this template
              <img src="../../assets/mask.png" alt="Mask" title="Mask" /> when
              making the basic outline of your map to make sure the scale is
              correct. Generally the height of an area should be a lot higher
              than 21 pixels to prevent it from feeling cramped.
            </p>
          </Collapsible>
        </div>

        <div class="section">
          <Collapsible title="Wallmask">
            <p>
              In the advanced settings you can enable the wallmask, this will
              overwrite the default wallmask that gets generated from the
              terrain. You can use this feature if you want to add things to
              your map that can be blown up but not collide with the sorcerers.
              You can also use it for example for stairs that have distinct
              steps but a smooth diagonal wallmask so it can be scaled without
              jumping. The wallmask is always 6x6 so it will have to be scaled
              down if you use a smaller scale (eg if you have a terrain that's
              600 pixels wide on scale 3, the wallmask should be scaled down 50%
              to 300 pixels to match). Because the wallmask is not shown to the
              player this image can be black + transparent to reduce the file
              size.
            </p>
          </Collapsible>
        </div>

        <div class="section">
          <Collapsible title="Background">
            <p>
              The background is placed behind the sorcerers and can't be blown
              up. It can be used to show where the terrain used to be after it
              has been blown up and to add some more detail to the map.
              Typically the colors used for the background are less saturated so
              it's clear what's part of the terrain and what is not. The sky
              does not need to be part of the background, you can use a built in
              parallax background for this in the advanced settings.
            </p>
          </Collapsible>
        </div>

        <div class="section">
          <Collapsible title="Overlays">
            <p>
              Overlays are drawn on top of the sorcerers and become transparent
              for sorcerers intersecting them. This means the image should fit
              the content closely and generally be fairly rectangular. Overlays
              can be dragged in the right position after adding. They can be
              used for sorcerers to hide behind and can get blown up like the
              terrain.
            </p>
          </Collapsible>
        </div>

        <div class="section">
          <Collapsible title="Advanced settings">
            <ul>
              <li>
                <h4>Scale</h4>
                <p>
                  The scale is the resolution of the map, a smaller scale can be
                  used to add more detail to the map. Keep in mind that
                  collisions (the wallmask) are always at the 6x6 scale. For
                  this reason multiples of 6 (6, 3, 2, 1) are preferred. It is
                  recommended to first plan out the layout of your map at the
                  6x6 scale and then scale it up if you want to work at a higher
                  resolution.
                </p>
              </li>
              <li>
                <h4>Spawn area</h4>
                <p>
                  The spawn area can either be changed from the advanced
                  settings or by dragging the red box in the builder. The spawn
                  area dictates where sorcerers can spawn at the start of the
                  game.
                </p>
              </li>
              <li>
                <h4>Parallax background & vertical offset</h4>
                <p>
                  A parallax background adds some more depth to the game by
                  making details in the distance move slower than details closer
                  by. The vertical offset can be used to move the still layers
                  up or down. If you wish to add your own parallax background,
                  pull requests are welcome! Take a look at
                  <code>src/data/map/background.ts</code> to see how they're
                  configured.
                </p>
              </li>
            </ul>
          </Collapsible>
        </div>

        <div class="section">
          <Collapsible title="Publishing" defaultOpen>
            <p>
              If you made a cool map that you want to share, feel free to make a
              pull request to add it to the game (See
              <code>src/util/assets/constants.ts</code>). If you do not know how
              to use git you can also
              <a
                href="https://github.com/lorgan3/sorcerers/issues"
                target="_blank"
                rel="noopener noreferrer"
                >open an issue</a
              >
              so someone else can add it for you. All reasonable maps will be
              accepted, if you have a crazy idea consider contacting me first if
              you want to ensure it can get added to the game.<br />
              Please optimize the images first (eg
              <a
                href="https://imageoptim.com/mac"
                target="_blank"
                rel="noopener noreferrer"
                >imageOptim</a
              >) before compiling the final version of your map, this can easily
              cut the filesize in half.
            </p>
          </Collapsible>
        </div>
      </div>
      <img v-if="background.visible" :src="background.data" class="layer" />
      <img v-if="terrain.visible" :src="terrain.data" class="layer" />
      <img v-if="mask.visible" :src="mask.data" class="layer wallmask" />
      <template v-for="(layer, i) in layers">
        <div
          v-if="layer.visible"
          class="overlay"
          @mousedown="(event: MouseEvent) => handleMouseDown(event, layer)"
          :style="{
            translate: `${layer.x * advancedSettings.scale}px ${
              layer.y * advancedSettings.scale
            }px`,
          }"
        >
          <span class="meta">Layer {{ i }} ({{ layer.x }}, {{ layer.y }})</span>
          <img :src="(layer.data as string)" />
        </div>
      </template>
      <BoundingBox :bbox="advancedSettings.bbox" :onChange="handleBBoxChange" />
      <BoundingBox
        v-for="(ladder, i) in ladders"
        :bbox="ladder"
        :onChange="(bbox) => (ladders[i] = bbox)"
        :onClear="() => ladders.splice(i, 1)"
        color="#00f"
        draggable
      />
    </section>
    <WfcDialog
      v-if="showWfcDialog"
      :settings="wfcSettings"
      :initialError="wfcInitialError"
      :onGenerate="handleWfcGenerated"
      :onClose="() => { showWfcDialog = false; wfcInitialError = ''; }"
    />
    <AiAlignDialog
      v-if="showAiAlign"
      :maskSrc="mask.data"
      :aiSrc="aiAlignSrc"
      :onConfirm="handleAiAlignConfirm"
      :onClose="() => (showAiAlign = false)"
    />
  </div>
</template>

<style lang="scss" scoped>
.builder {
  height: 100vh;
  display: flex;

  box-sizing: border-box;
  background: url("../../assets/parchment.png");
  image-rendering: pixelated;
  background-size: 256px;
  z-index: 1;

  .controls {
    width: 200px;
    border-right: 4px solid var(--primary);
    box-shadow: 5px 0 10px #00000069;
    padding: 10px;
    overflow-y: auto;

    .section {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .mask-row {
      display: flex;
      align-items: flex-start;
      gap: 4px;

      > div {
        flex: 1;
      }
    }

    > .section + .section {
      padding-top: 10px;
      background-image: linear-gradient(90deg, transparent, var(--border-accent-faint) 20%, var(--border-accent-faint) 80%, transparent);
      background-size: 100% 1px;
      background-repeat: no-repeat;
      background-position: top;
    }

    .layer-title {
      display: flex;
      justify-content: space-between;

      .close-button {
        background: none;
        border: none;
        margin: 0;
        padding: 0;
        cursor: pointer;
        font-size: 18px;
      }
    }

    .inputButton {
      .placeholder {
        width: 100%;
        height: 100px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--background);
        cursor: pointer;
        box-shadow: 0 0 10px inset var(--primary);
        border-radius: var(--small-radius);
      }

      img {
        width: 100%;
        height: 100px;
        object-fit: cover;
        box-shadow: 0 0 10px inset var(--primary);
        border-radius: var(--small-radius);

        &:hover {
          object-fit: contain;
        }
      }
    }
  }

  .preview {
    overflow: auto;
    position: relative;
    flex: 1;

    &.add-ladder {
      cursor: context-menu;
    }

    img.layer {
      position: absolute;
      transform-origin: 0 0;
      scale: var(--scale) var(--scale);
      image-rendering: pixelated;

      &.wallmask {
        scale: 6 6;
      }
    }

    .overlay {
      cursor: grab;
      position: relative;

      .meta {
        display: none;
        position: absolute;
        font-family: Eternal;
        font-size: 36px;
        top: -40px;
        z-index: 100;
      }

      img {
        position: absolute;
        top: 0;
        left: 0;
        transform-origin: 0 0;
        scale: var(--scale) var(--scale);
        image-rendering: pixelated;
      }

      &:hover {
        img {
          top: calc(var(--scale) * -1px);
          left: calc(var(--scale) * -1px);
          border: 1px solid rgba(0, 0, 0, 0.6);
        }

        .meta {
          display: block;
        }
      }
    }

    .description {
      position: absolute;
      padding: 20px;
      max-width: 800px;

      .section {
        margin-top: 16px;
      }

      ul {
        margin-left: 10px;
      }

      h4 {
        margin-top: 10px;
      }

      code {
        font-family: monospace;
        font-size: 14px;
      }
    }
  }

  .wfc-generating {
    display: inline-block;
    width: 16px;
    height: 16px;
    line-height: 16px;
    text-align: center;
    padding: 4px;
    margin: -4px 0;
    font-size: 16px;
    vertical-align: middle;
    box-sizing: content-box;
  }
}
</style>
