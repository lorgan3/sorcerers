<script setup lang="ts">
import { loadAsMap } from "../../util/assets/index";
import { onMounted, ref } from "vue";
import { Assets } from "pixi.js";
import { Config, Map } from "../../data/map";
import { DefaultMap, defaultMaps } from "../../util/assets/constants";

const { onEdit, defaultMap } = defineProps<{
  onEdit: (map: Config, name: string) => void;
  defaultMap?: keyof typeof defaultMaps;
}>();

const CUSTOM = "custom";
const EMPTY = "empty";

const selectedMap = ref<DefaultMap & { map: string }>(
  defaultMap
    ? {
        map: defaultMap,
        ...defaultMaps[defaultMap],
      }
    : {
        map: EMPTY,
        path: "",
        author: "",
        recommendedCharacterCount: 0,
      }
);

const mapPath = ref("");
const customUpload = ref<HTMLInputElement>();

const handleChange = (event: Event) => {
  const map = (event.target as HTMLSelectElement).value;

  if (map === CUSTOM) {
    customUpload.value!.click();
    selectedMap.value = {
      map: CUSTOM,
      path: "",
      author: "",
      recommendedCharacterCount: 0,
    };
    mapPath.value = "";
    return;
  }

  if (map === EMPTY) {
    selectedMap.value = {
      map: EMPTY,
      path: "",
      author: "",
      recommendedCharacterCount: 0,
    };
    mapPath.value = "";
    return;
  }

  const defaultMap = map as keyof typeof defaultMaps;
  selectedMap.value = { map: defaultMap, ...defaultMaps[defaultMap] };
  mapPath.value = defaultMaps[defaultMap].path;

  Assets.load(loadAsMap(defaultMaps[defaultMap].path)).then(async (map) =>
    onEdit(map, defaultMap)
  );
};

const reset = () => {
  if (!defaultMap) {
    selectedMap.value = {
      map: EMPTY,
      path: "",
      author: "",
      recommendedCharacterCount: 0,
    };
    mapPath.value = "";
    return;
  }

  Assets.load(loadAsMap(defaultMaps[defaultMap].path)).then(async (map) =>
    onEdit(map, defaultMap)
  );

  selectedMap.value = { map: defaultMap, ...defaultMaps[defaultMap] };
  mapPath.value = defaultMaps[defaultMap].path;
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
      onEdit(
        await Map.parse(file),
        `${file.name.split(".").slice(0, -1).join(".")} (Custom)`
      );
    } catch (error) {
      console.error(error);
      reset();
      return;
    }

    selectedMap.value = {
      map: CUSTOM,
      path: file.name,
      author: "",
      recommendedCharacterCount: 0,
    };
    mapPath.value = reader.result as string;
  };
};

onMounted(() => reset());
</script>

<template>
  <section class="map-select">
    <div class="map-preview">
      <div class="custom-select">
        <select @change="handleChange">
          <option
            v-if="!defaultMap"
            :value="EMPTY"
            :selected="selectedMap.map === EMPTY"
          >
            Select map...
          </option>
          <option
            v-for="({ path }, map) in defaultMaps"
            :value="map"
            :selected="selectedMap.path === path"
          >
            {{ map.replace("_", " ") }}
          </option>
          <option :value="CUSTOM" :selected="selectedMap.map === CUSTOM">
            Upload custom map
          </option>
        </select>
      </div>
      <img v-if="mapPath" :src="mapPath" />
      <div v-else-if="selectedMap.map !== EMPTY" class="center-wrapper">
        <span class="icon spinner">߷</span>
      </div>
      <input
        type="file"
        accept="image/*"
        hidden
        @change="handleUploadMap"
        @cancel="reset"
        ref="customUpload"
      />
    </div>
    <ul v-if="selectedMap.map in defaultMaps" class="info">
      <li>
        <h3>Author</h3>
        {{ selectedMap.author }}
      </li>

      <li>
        <h3>Recommended character count</h3>
        {{ selectedMap.recommendedCharacterCount }}
      </li>

      <li v-if="selectedMap.theme">
        <h3>Theme</h3>
        {{ selectedMap.theme }}
      </li>
    </ul>
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
  background: linear-gradient(180deg, var(--parchment-light), var(--parchment-dark));
  color: var(--primary);
  cursor: pointer;
  border: none;
  border-bottom: 2px solid var(--border-accent);
  font-size: 18px;
  font-family: Eternal;
  transition: border-color 0.3s ease;

  &:hover {
    border-bottom-color: var(--border-accent-hover);
  }

  &:focus {
    outline: none;
    border-bottom-color: var(--border-accent-hover);
    box-shadow: 0 2px 6px var(--glow-warm-soft);
  }
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

.map-select {
  margin-top: 10px;
  display: flex;
  flex-direction: row;
  gap: 20px;

  .info {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
}

.map-preview {
  display: flex;
  flex-direction: column;
  width: 250px;
  height: 200px;
  align-items: center;
  border: 2px solid var(--border-accent);
  border-radius: 4px;
  overflow: hidden;
  background: linear-gradient(180deg, var(--parchment-light), var(--parchment-dark));
  box-shadow: 0 2px 8px rgba(30, 15, 5, 0.3);

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
  line-height: 30px;
  width: 36px;
  height: 36px;
  font-size: 36px;
}
</style>
