<script setup lang="ts">
import { ref } from "vue";
import { Map } from "../data/map";
import Input from "./Input.vue";

const { onBack } = defineProps<{
  onBack: () => void;
}>();

const background = ref("");
const backgroundImg = ref<HTMLImageElement | null>(null);
const terrain = ref("");
const terrainImg = ref<HTMLImageElement | null>(null);

const name = ref("");

const handleAddTerrain = (event: Event) => {
  const file = (event.target as HTMLInputElement).files![0];

  if (!file) {
    return;
  }

  var reader = new FileReader();
  reader.readAsDataURL(file);
  reader.onload = () => (terrain.value = reader.result as string);
};

const handleAddBackground = (event: Event) => {
  const file = (event.target as HTMLInputElement).files![0];

  if (!file) {
    return;
  }

  var reader = new FileReader();
  reader.readAsDataURL(file);
  reader.onload = () => (background.value = reader.result as string);
};

const handleBuild = async () => {
  const map = await Map.fromConfig({
    terrain: { data: terrain.value },
    background: { data: background.value },
  });

  const url = URL.createObjectURL(await map.toBlob());
  setTimeout(() => window.URL.revokeObjectURL(url), 1000);

  const link = document.createElement("a");
  link.download = `${name.value || "map"}.png`;
  link.href = url;
  link.click();
};
</script>

<template>
  <div class="builder">
    <section class="controls flex-list">
      <div class="section">
        <h2>Terrain</h2>
        <label class="inputButton">
          <input type="file" @change="handleAddTerrain" />
          <img v-if="terrain" :src="terrain" ref="terrainImg" />
          <div v-else class="placeholder">➕ Add image</div>
        </label>
        <Input label="Scale" value="6" disabled />
      </div>

      <div class="section">
        <h2>Background</h2>
        <label class="inputButton">
          <input type="file" @change="handleAddBackground" />
          <img v-if="background" :src="background" ref="backgroundImg" />
          <div v-else class="placeholder">➕ Add image</div>
        </label>
        <Input label="Scale" value="6" disabled />
      </div>

      <div class="section">
        <h2>Details</h2>
        <Input label="Name" autofocus v-model="name" />
      </div>

      <button class="primary" @click="handleBuild">Build</button>
      <button class="secondary" @click="onBack">Back</button>
    </section>
    <section class="preview">
      <p class="description">
        Build your own map by drawing a terrain and background image. All opaque
        pixels on the terrain will be used as collision map for the level.
      </p>
      <img v-if="background" :src="background" />
      <img v-if="terrain" :src="terrain" />
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

    .section {
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    label {
      display: flex;
      gap: 5px;

      span {
        width: 80px;
      }

      input {
        flex: 1;
      }
    }

    .inputButton {
      input {
        display: none;
      }

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
      width: 300%;
      image-rendering: pixelated;
    }

    .description {
      position: absolute;
      padding: 20px;
      max-width: 600px;
    }
  }
}
</style>
