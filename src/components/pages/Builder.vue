<script setup lang="ts">
import { onMounted, ref, watch } from "vue";
import { Map, Config, Layer } from "../../data/map";
import BoundingBox from "../molecules/BoundingBox.vue";
import { BBox } from "../../data/map/bbox";
import { useRouter } from "vue-router";
import { GameSettings } from "../../util/localStorage/settings";
import BuilderWizard from "../organisms/BuilderWizard.vue";
import BuilderSettings from "../organisms/BuilderSettings.vue";
import ImageInput from "../molecules/ImageInput.vue";
import IconButton from "../atoms/IconButton.vue";
import plus from "pixelarticons/svg/plus.svg";
import shuffle from "pixelarticons/svg/shuffle.svg";
import close from "pixelarticons/svg/close.svg";
import BuildDialog from "../molecules/BuildDialog.vue";
import Collapsible from "../atoms/Collapsible.vue";
import BuilderDescription from "../molecules/BuilderDescription.vue";
import { useBuilderLayers } from "./composables/useBuilderLayers";
import { useBuilderLadders } from "./composables/useBuilderLadders";
import { useBuilderMap } from "./composables/useBuilderMap";
import { useBuilderWizard } from "./composables/useBuilderWizard";
import { useMapDraft } from "../../data/builder/draft";

const { onPlay, config } = defineProps<{
  onPlay: (key: string, map: Map | Config, settings: GameSettings) => void;
  config?: Config;
}>();
const router = useRouter();
const preview = ref<HTMLDivElement>();

const wizard = useBuilderWizard();

const settingsOpen = ref(false);
const buildOpen = ref(false);

const {
  terrain, mask, background, layers, ladders, advancedSettings, oldScale,
} = useMapDraft();

const {
  handleAddTerrain, handleSetTerrainVisibility,
  handleAddMask, handleSetMaskVisibility,
  handleAddBackground, handleSetBackgroundVisibility,
  handleAddLayer, handleRemoveLayer, handleSetLayerVisibility,
} = useBuilderLayers(preview);

const { creatingLadder, handleCreateLadder } = useBuilderLadders(preview);

const { handleTest, loadMap } = useBuilderMap();

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
    <section class="controls">
      <div class="title-row">
        <h2>Preview</h2>
        <span class="title-buttons">
          <IconButton title="Open wizard" :onClick="() => wizard.openLast()" :icon="shuffle" />
          <IconButton title="Close" :onClick="() => router.replace('/')" :icon="close" />
        </span>
      </div>

      <div class="controls-scroll">
        <div class="section">
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
            <IconButton title="Add layer" :onClick="handleAddLayer" :icon="plus" />
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
      </div>

      <div class="controls-footer">
        <button class="primary" title="Build and save map to file system" @click="buildOpen = true">
          Build
        </button>
        <button class="primary" title="Build and test" @click="() => handleTest(onPlay)">
          Test
        </button>
      </div>
    </section>
    <section
      :class="{ preview: true, 'add-ladder': creatingLadder }"
      ref="preview"
      @mousedown="handleCreateLadder"
    >
      <div v-if="!terrain.data && !background.data && !mask.data" class="description">
        <div class="section">
          <Collapsible title="Publishing" defaultOpen>
            <BuilderDescription topic="publishing" />
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
    <BuilderWizard />
    <BuildDialog :open="buildOpen" :onClose="() => (buildOpen = false)" />
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
    border-right: 2px solid var(--border-accent);
    box-shadow: 2px 0 0 var(--shadow-hard);
    display: flex;
    flex-direction: column;
    box-sizing: border-box;

    .title-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px;

      h2 {
        margin: 0;
      }

      .title-buttons {
        display: flex;
        gap: 4px;
      }
    }

    .controls-scroll {
      flex: 1;
      overflow-y: auto;
      padding: 0 10px 10px;
      display: flex;
      flex-direction: column;
      gap: 10px;

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
        background: repeating-linear-gradient(
            90deg,
            var(--border-accent-faint) 0 4px,
            transparent 4px 8px
          )
          top / 100% 2px no-repeat;
      }
    }

    .controls-footer {
      display: flex;
      flex-direction: column;
      gap: 6px;
      padding: 10px;
      border-top: 2px solid var(--border-accent-faint);
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

      code {
        font-family: monospace;
        font-size: 14px;
      }
    }
  }
}
</style>
