<script setup lang="ts">
import { Ref, onMounted, ref, watch } from "vue";
import { Map, Layer, Config } from "../../data/map";
import Input from "../atoms/Input.vue";
import { Server } from "../../data/network/server";
import { Team } from "../../data/team";
import BoundingBox from "../molecules/BoundingBox.vue";
import { BBox } from "../../data/map/bbox";
import { useRouter } from "vue-router";
import { logEvent } from "../../util/firebase";
import { GameSettings } from "../../util/localStorage/settings";
import { defaults } from "../../util/localStorage/settings";
import MapSelect from "../organisms/MapSelect.vue";
import BuilderSettings, {
  AdvancedSettings,
} from "../organisms/BuilderSettings.vue";
import ImageInput from "../molecules/ImageInput.vue";
import IconButton from "../atoms/IconButton.vue";
import plus from "pixelarticons/svg/plus.svg";

const { onPlay, config } = defineProps<{
  onPlay: (key: string, map: Map | Config, settings: GameSettings) => void;
  config?: Config;
}>();
const router = useRouter();
const preview = ref<HTMLDivElement>();

const name = ref("");
const terrain = ref({ data: "", visible: false });
const mask = ref({ data: "", visible: false });
const background = ref({ data: "", visible: false });
const layers = ref<Array<Layer & { visible: boolean }>>([]);

const settingsOpen = ref(false);
const advancedSettings = ref<AdvancedSettings>({
  scale: 6,
  bbox: BBox.create(0, 0),
  customMask: false,
  parallaxName: "",
  parallaxOffset: 0,
});

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

const addImageFactory =
  (ref: Ref, visible = true) =>
  (_: File, data: string) => {
    ref.value = { data, visible };

    if (advancedSettings.value.bbox.isEmpty()) {
      var image = new Image();
      image.src = data;

      image.onload = () => {
        advancedSettings.value.bbox = BBox.create(image.width, image.height);
      };
    }
  };

const handleAddTerrain = addImageFactory(terrain);
const handleSetTerrainVisibility = (visible: boolean) =>
  (terrain.value.visible = visible);
const handleAddMask = addImageFactory(mask, false);
const handleSetMaskVisibility = (visible: boolean) =>
  (mask.value.visible = visible);

const handleAddBackground = addImageFactory(background);
const handleSetBackgroundVisibility = (visible: boolean) =>
  (background.value.visible = visible);

const handleBuild = async () => {
  const map = await Map.fromConfig({
    terrain: { data: terrain.value.data, mask: mask.value.data },
    background: { data: background.value.data || terrain.value.data },
    layers: layers.value
      .filter((layer) => !!layer.data)
      .map((layer) => ({ ...layer })),
    bbox: advancedSettings.value.bbox,
    parallax: {
      name: advancedSettings.value.parallaxName,
      offset: advancedSettings.value.parallaxOffset,
    },
    scale: advancedSettings.value.scale,
  });

  const url = URL.createObjectURL(await map.toBlob());
  setTimeout(() => window.URL.revokeObjectURL(url), 1000);

  const link = document.createElement("a");
  link.download = `${name.value || "map"}.png`;
  link.href = url;
  link.click();

  logEvent("build_map");
};

const handleTest = async () => {
  const config: Config = {
    terrain: { data: terrain.value.data, mask: mask.value.data },
    background: { data: background.value.data || terrain.value.data },
    layers: layers.value
      .filter((layer) => !!layer.data)
      .map((layer) => ({ ...layer })),
    bbox: advancedSettings.value.bbox,
    parallax: {
      name: advancedSettings.value.parallaxName,
      offset: advancedSettings.value.parallaxOffset,
    },
    scale: advancedSettings.value.scale,
  };

  const server = new Server();
  server.addPlayer("Test player", Team.random());
  onPlay("0000", config, { ...defaults().gameSettings, teamSize: 1 });
};

const loadMap = (config: Config, map: string) => {
  terrain.value = { data: config.terrain.data as string, visible: true };
  background.value = { data: config.background.data as string, visible: true };
  layers.value = config.layers.map((layer) => ({ ...layer, visible: true }));
  advancedSettings.value = {
    bbox: BBox.fromJS(config.bbox) || BBox.create(0, 0),
    scale: config.scale,
    customMask: !!config.terrain.mask,
    parallaxName: config.parallax.name,
    parallaxOffset: config.parallax.offset,
  };
  name.value = map;

  if (config.terrain.mask) {
    mask.value = { data: config.terrain.mask as string, visible: false };
  } else {
    mask.value = { data: "", visible: false };
  }
};

const handleAddLayer = () =>
  layers.value.push({
    data: "",
    x: Math.round(preview.value!.scrollLeft / 6),
    y: Math.round(preview.value!.scrollTop / 6),
    visible: true,
  });

const handleRemoveLayer = (index: number) => {
  layers.value = layers.value.filter((_, i) => i !== index);
};

const handleSetLayerVisibility = (visible: boolean, index: number) => {
  layers.value[index].visible = visible;
};

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
        <ImageInput
          name="Terrain"
          :onAdd="handleAddTerrain"
          v-model="terrain.data"
          :onToggleVisibility="handleSetTerrainVisibility"
          clearable
        />
        <ImageInput
          v-if="advancedSettings.customMask"
          name="Mask"
          :onAdd="handleAddMask"
          v-model="mask.data"
          :onToggleVisibility="handleSetMaskVisibility"
          clearable
        />
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
      <button class="primary" title="Build and test" @click="handleTest">
        Test
      </button>
      <button class="secondary" @click="() => router.replace('/')">Back</button>
    </section>
    <section class="preview" ref="preview">
      <div v-if="!terrain.data && !background.data" class="description">
        <p>
          Build your own map by drawing a terrain and background image. All
          opaque pixels on the terrain will be used as collision map for the
          level.
          <br />You can also load a default or custom map to adjust it or see
          how it's made.
        </p>
        <MapSelect :onEdit="loadMap" />
      </div>
      <img v-if="background.visible" :src="background.data" />
      <img v-if="terrain.visible" :src="terrain.data" />
      <img v-if="mask.visible" :src="mask.data" />
      <template v-for="(layer, i) in layers">
        <div
          v-if="layer.visible"
          class="layer"
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
    </section>
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

    img {
      position: absolute;
      transform-origin: 0 0;
      scale: var(--scale) var(--scale);
      image-rendering: pixelated;
    }

    .layer {
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
      max-width: 600px;
    }
  }
}
</style>
