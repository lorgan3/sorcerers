<script setup lang="ts">
import { defaultMaps, loadAsMap } from "../../util/assets/index";
import { onMounted, ref } from "vue";
import { Assets } from "pixi.js";
import { Map } from "../../data/map";

const { onEdit } = defineProps<{
  onEdit: (map: Map, name: string) => void;
}>();

const DEFAULT_MAP = "Playground" as keyof typeof defaultMaps;
const CUSTOM = "custom";

const selectedMap = ref<{ map: string; path: string }>({
  map: DEFAULT_MAP,
  path: defaultMaps[DEFAULT_MAP],
});
const mapPath = ref("");
const customUpload = ref<HTMLInputElement>();

const handleChange = (event: Event) => {
  const map = (event.target as HTMLSelectElement).value;

  if (map === CUSTOM) {
    customUpload.value!.click();
    mapPath.value = "";
    return;
  }

  const defaultMap = map as keyof typeof defaultMaps;
  selectedMap.value = { map: defaultMap, path: defaultMaps[defaultMap] };
  mapPath.value = defaultMaps[defaultMap];

  Assets.load(loadAsMap(defaultMaps[defaultMap])).then(async (map) =>
    onEdit(await Map.fromConfig(map), defaultMap)
  );
};

const reset = () => {
  Assets.load(loadAsMap(defaultMaps[DEFAULT_MAP])).then(async (map) =>
    onEdit(await Map.fromConfig(map), DEFAULT_MAP)
  );

  selectedMap.value = { map: DEFAULT_MAP, path: defaultMaps[DEFAULT_MAP] };
  mapPath.value = defaultMaps[DEFAULT_MAP];
};

const handleUploadMap = (event: Event) => {
  const file = (event.target as HTMLInputElement).files![0];

  if (!file) {
    reset();
    return;
  }

  const reader = new FileReader();
  reader.readAsDataURL(file);
  reader.onload = async () => {
    try {
      onEdit(await Map.fromBlob(file), "Custom");
    } catch (error) {
      console.error(error);
      reset();
      return;
    }

    selectedMap.value = { map: CUSTOM, path: file.name };
    mapPath.value = reader.result as string;
  };
};

onMounted(() => reset());
</script>

<template>
  <section class="map-select">
    <h2>Map</h2>
    <div class="map-preview">
      <div class="custom-select">
        <select @change="handleChange">
          <option
            v-for="(path, map) in defaultMaps"
            :value="map"
            :selected="selectedMap.path === path"
          >
            {{ map }}
          </option>
          <option :value="CUSTOM" :selected="selectedMap.map === CUSTOM">
            Upload custom map
          </option>
        </select>
      </div>
      <img v-if="mapPath" :src="mapPath" />
      <div v-else class="center-wrapper">
        <span class="icon icon--spinning">߷</span>
      </div>
    </div>
    <input
      type="file"
      hidden
      @change="handleUploadMap"
      @cancel="reset"
      ref="customUpload"
    />
  </section>
</template>

<style lang="scss" scoped>
.custom-select {
  width: 100%;
  position: relative;
}

select {
  appearance: none;
  -webkit-appearance: none; /*  safari  */
  width: 100%;
  padding: 10px 6px;
  background-color: var(--background);
  color: #000;
  cursor: pointer;
  border: none;
  border-bottom: 2px solid var(--primary);
  font-size: 18px;
}

.custom-select::before,
.custom-select::after {
  --size: 0.3rem;
  content: "";
  position: absolute;
  right: 6px;
  pointer-events: none;
}

.custom-select::before {
  border-left: var(--size) solid transparent;
  border-right: var(--size) solid transparent;
  border-bottom: var(--size) solid black;
  top: 40%;
}

.custom-select::after {
  border-left: var(--size) solid transparent;
  border-right: var(--size) solid transparent;
  border-top: var(--size) solid black;
  top: 55%;
}

.map-preview {
  display: flex;
  flex-direction: column;
  width: 250px;
  height: 200px;
  align-items: center;
  border: 2px solid var(--primary);
  border-radius: 5px;
  overflow: hidden;
  background: var(--background);
  box-shadow: 5px 5px 10px #00000069;
  margin-top: 10px;

  .center-wrapper {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  img {
    height: 160px;
    width: 100%;
    object-fit: cover;
    image-rendering: pixelated;
  }
}

.icon {
  display: inline-block;
  transform-origin: 50%;
  line-height: 30px;
  width: 36px;
  height: 36px;
  font-size: 36px;

  &--spinning {
    animation: spin 0.5s linear infinite;
  }
}
</style>
