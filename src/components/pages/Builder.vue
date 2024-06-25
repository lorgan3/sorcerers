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

const { onPlay, config } = defineProps<{
  onPlay: (key: string, map: Map | Config, settings: GameSettings) => void;
  config?: Config;
}>();
const router = useRouter();

const terrain = ref("");
const mask = ref("");
const background = ref("");
const layers = ref<Layer[]>([]);
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

onMounted(async () => {
  if (config) {
    loadMap(config, "");
  }
});

watch(
  () => advancedSettings.value.customMask,
  (useMask) => {
    if (!useMask) {
      mask.value = "";
    }
  }
);

const addImageFactory = (ref: Ref) => (event: Event) => {
  const file = (event.target as HTMLInputElement).files![0];

  if (!file) {
    return;
  }

  var reader = new FileReader();
  reader.readAsDataURL(file);

  reader.onload = () => {
    ref.value = reader.result as string;

    if (advancedSettings.value.bbox.isEmpty()) {
      var image = new Image();
      image.src = ref.value;

      image.onload = () => {
        advancedSettings.value.bbox = BBox.create(image.width, image.height);
      };
    }
  };
};

const handleAddTerrain = addImageFactory(terrain);
const handleAddMask = addImageFactory(mask);
const handleAddBackground = addImageFactory(background);

const handleBuild = async () => {
  const map = await Map.fromConfig({
    terrain: { data: terrain.value, mask: mask.value },
    background: { data: background.value || terrain.value },
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
    terrain: { data: terrain.value, mask: mask.value },
    background: { data: background.value || terrain.value },
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
  terrain.value = config.terrain.data as string;
  background.value = config.background.data as string;
  layers.value = config.layers;
  advancedSettings.value = {
    bbox: BBox.fromJS(config.bbox) || BBox.create(0, 0),
    scale: config.scale,
    customMask: !!config.terrain.mask,
    parallaxName: config.parallax.name,
    parallaxOffset: config.parallax.offset,
  };
  name.value = map;

  if (config.terrain.mask) {
    mask.value = config.terrain.mask as string;
  } else {
    mask.value = "";
  }
};

const handleAddLayer = () =>
  layers.value.push({
    data: "",
    x: Math.round(preview.value!.scrollLeft / 6),
    y: Math.round(preview.value!.scrollTop / 6),
  });

const handleRemoveLayer = (index: number) => {
  layers.value = layers.value.filter((_, i) => i !== index);
};

const handleAddLayerImage = (event: Event, layer: Layer) => {
  const file = (event.target as HTMLInputElement).files![0];

  if (!file) {
    return;
  }

  var reader = new FileReader();
  reader.readAsDataURL(file);
  reader.onload = () => (layer.data = reader.result as string);
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
        <label class="inputButton">
          <input
            hidden
            type="file"
            @change="handleAddTerrain"
            accept="image/*"
          />
          <img v-if="terrain" :src="terrain" />
          <div v-else class="placeholder">➕ Add terrain</div>
        </label>
        <template v-if="advancedSettings.customMask">
          <label class="inputButton">
            <input
              hidden
              type="file"
              @change="handleAddMask"
              accept="image/*"
            />
            <img v-if="mask" :src="mask" />
            <div v-else class="placeholder">➕ Add wallmask</div>
          </label>
        </template>
        <label class="inputButton">
          <input
            hidden
            type="file"
            @change="handleAddBackground"
            accept="image/*"
          />
          <img v-if="background" :src="background" />
          <div v-else class="placeholder">➕ Add background</div>
        </label>
      </div>

      <div class="section">
        <h2>
          Overlays
          <button class="icon-button" title="Add layer" @click="handleAddLayer">
            ➕
          </button>
        </h2>

        <div v-for="(layer, i) in layers" class="section">
          <h3 class="layer-title" :key="i">
            Layer {{ i }}
            <button class="close-button" @click="() => handleRemoveLayer(i)">
              ✖️
            </button>
          </h3>
          <label class="inputButton">
            <input
              hidden
              type="file"
              @change="(event) => handleAddLayerImage(event, layer)"
              accept="image/*"
            />
            <img v-if="layer.data" :src="(layer.data as string)" />
            <div v-else class="placeholder">➕ Add layer</div>
          </label>
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
      <div v-if="!terrain && !background" class="description">
        <p>
          Build your own map by drawing a terrain and background image. All
          opaque pixels on the terrain will be used as collision map for the
          level.
          <br />You can also load a default or custom map to adjust it or see
          how it's made.
        </p>
        <MapSelect :onEdit="loadMap" />
      </div>
      <img v-if="background" :src="background" />
      <img v-if="terrain" :src="terrain" />
      <template v-for="(layer, i) in layers">
        <div
          v-if="layer.data"
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

  .controls {
    width: 200px;
    border: 4px solid var(--primary);
    border-radius: var(--big-radius);
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
