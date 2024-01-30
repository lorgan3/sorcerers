<script setup lang="ts">
import { Ref, ref } from "vue";
import { Map, Layer, Config } from "../data/map";
import Input from "./Input.vue";
import { defaultMaps } from "../util/assets";
import { AssetsContainer } from "../util/assets/assetsContainer";

const { onBack } = defineProps<{
  onBack: () => void;
}>();

const SCALE = 6;
const terrain = ref("");
const mask = ref("");
const background = ref("");
const layers = ref<Layer[]>([]);
const addMask = ref(false);

const name = ref("");

const addImageFactory = (ref: Ref) => (event: Event) => {
  const file = (event.target as HTMLInputElement).files![0];

  if (!file) {
    return;
  }

  var reader = new FileReader();
  reader.readAsDataURL(file);
  reader.onload = () => (ref.value = reader.result as string);
};

const handleAddTerrain = addImageFactory(terrain);
const handleAddMask = addImageFactory(mask);
const handleAddBackground = addImageFactory(background);

const handleBuild = async () => {
  const map = await Map.fromConfig({
    terrain: { data: terrain.value, mask: mask.value },
    background: { data: background.value },
    layers: layers.value
      .filter((layer) => !!layer.data)
      .map((layer) => ({ ...layer })),
  });

  const url = URL.createObjectURL(await map.toBlob());
  setTimeout(() => window.URL.revokeObjectURL(url), 1000);

  const link = document.createElement("a");
  link.download = `${name.value || "map"}.png`;
  link.href = url;
  link.click();
};

const handleLoadCustom = async (event: Event) => {
  const file = (event.target as HTMLInputElement).files![0];

  if (!file) {
    return;
  }

  try {
    const config = await Map.parse(file);
    loadMap(config, file.name.split(".").slice(0, -1).join(""));
  } catch {
    alert(`No map data was found in ${file.name}`);
  }
};

const handleLoad = (map: string) => {
  loadMap(AssetsContainer.instance.assets![map], map);
};

const loadMap = (config: Config, map: string) => {
  terrain.value = config.terrain.data as string;
  background.value = config.background.data as string;
  layers.value = config.layers;
  name.value = map;

  if (config.terrain.mask) {
    mask.value = config.terrain.mask as string;
    addMask.value = true;
  } else {
    mask.value = "";
  }
};

const handleAddLayer = () => layers.value.push({ data: "", x: 0, y: 0 });

const handleRemoveLayer = (index: number) => {
  layers.value = [...layers.value.splice(index, 0)];
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
    layer.x = x + Math.round((moveEvent.pageX - startX) / SCALE);
    layer.y = y + Math.round((moveEvent.pageY - startY) / SCALE);
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

const handleEnableMask = () => (addMask.value = true);
</script>

<template>
  <div class="builder" :style="{ '--scale': SCALE }">
    <section class="controls flex-list">
      <div class="section">
        <h2>Terrain</h2>
        <label class="inputButton">
          <input
            hidden
            type="file"
            @change="handleAddTerrain"
            accept="image/*"
          />
          <img v-if="terrain" :src="terrain" />
          <div v-else class="placeholder">➕ Add image</div>
        </label>
        <button v-if="!addMask" class="secondary" @click="handleEnableMask">
          Add mask
        </button>
        <label v-else class="inputButton">
          <input hidden type="file" @change="handleAddMask" accept="image/*" />
          <img v-if="mask" :src="mask" />
          <div v-else class="placeholder">➕ Add image</div>
        </label>
        <Input label="Scale" value="6" disabled />
      </div>

      <div class="section">
        <h2>Background</h2>
        <label class="inputButton">
          <input
            hidden
            type="file"
            @change="handleAddBackground"
            accept="image/*"
          />
          <img v-if="background" :src="background" />
          <div v-else class="placeholder">➕ Add image</div>
        </label>
        <Input label="Scale" value="6" disabled />
      </div>

      <div class="section">
        <h2>Overlays</h2>
        <button class="secondary" @click="handleAddLayer">Add layer</button>

        <div v-for="(layer, i) in layers" class="section">
          <h3 class="layer-title">
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
            <div v-else class="placeholder">➕ Add image</div>
          </label>

          <Input
            label="X"
            :value="layer.x.toString()"
            @change="(event: Event) => layer.x = parseInt((event.target as HTMLInputElement).value, 10)"
          />
          <Input
            label="Y"
            :value="layer.y.toString()"
            @change="(event: Event) => layer.y = parseInt((event.target as HTMLInputElement).value, 10)"
          />
          <Input label="Scale" value="6" disabled />
        </div>
      </div>

      <div class="section">
        <h2>Details</h2>
        <Input label="Name" autofocus v-model="name" />
      </div>

      <button class="primary" @click="handleBuild">Build</button>
      <button class="secondary" @click="onBack">Back</button>
    </section>
    <section class="preview">
      <div v-if="!terrain && !background" class="description">
        <p>
          Build your own map by drawing a terrain and background image. All
          opaque pixels on the terrain will be used as collision map for the
          level.
          <br />You can also load a default or custom map to adjust it or see
          how it's made.
        </p>
        <ul class="map-list">
          <li v-for="(asset, name) of defaultMaps">
            <label class="map" @click="handleLoad(name)">
              <img :src="asset" />
              <div>{{ name }}</div>
            </label>
          </li>
          <li>
            <label class="map custom-map">
              <input
                type="file"
                hidden
                @change="handleLoadCustom"
                accept="image/*"
              />
              <div>➕ Custom map</div>
            </label>
          </li>
        </ul>
      </div>
      <img v-if="background" :src="background" />
      <img v-if="terrain" :src="terrain" />
      <template v-for="layer in layers">
        <img
          v-if="layer.data"
          :src="(layer.data as string)"
          @mousedown="(event: MouseEvent) => handleMouseDown(event, layer)"
          class="layer"
          :style="{ translate: `${layer.x * SCALE}px ${layer.y * SCALE}px` }"
        />
      </template>
    </section>
  </div>
</template>

<style lang="scss" scoped>
.builder {
  height: 100vh;
  display: flex;

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

    label {
      display: flex;
      gap: 3px;

      span {
        width: 80px;
      }

      input {
        flex: 1;
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
      scale: 6 6;
      image-rendering: pixelated;
    }

    .layer {
      cursor: grab;
    }

    .description {
      position: absolute;
      padding: 20px;
      max-width: 600px;

      .map-list {
        display: flex;
        gap: 12px;
        margin: 12px 12px 12px 0;
      }

      .map {
        position: relative;
        box-shadow: 0 0 10px inset var(--primary);
        border-radius: var(--small-radius);
        background: var(--background);
        width: 200px;
        height: 100px;
        display: block;
        cursor: pointer;

        div {
          position: relative;
          background: rgba(255, 255, 255, 0.6);
          width: 100%;
          padding: 3px;
          box-sizing: border-box;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          text-align: center;
        }

        img {
          position: absolute;
          left: 0;
          top: 0;
          scale: 1 1;

          width: 100%;
          height: 100%;
          object-fit: cover;
        }
      }

      .custom-map {
        display: flex;
        align-items: center;

        div {
          background-color: transparent;
        }
      }
    }
  }
}
</style>
