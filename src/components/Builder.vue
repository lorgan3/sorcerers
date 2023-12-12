<script setup lang="ts">
import { ref } from "vue";
import { Map } from "../data/map";

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
  <div class="background">
    <div class="builder">
      <section class="controls flex-list">
        <div class="section">
          <h3>Terrain</h3>
          <label class="inputButton">
            <input type="file" @change="handleAddTerrain" />
            <img v-if="terrain" :src="terrain" ref="terrainImg" />
            <div v-else class="placeholder">Add image</div>
          </label>
          <label>
            <span>Scale</span>
            <input value="6" disabled />
          </label>
        </div>

        <div class="section">
          <h3>Background</h3>
          <label class="inputButton">
            <input type="file" @change="handleAddBackground" />
            <img v-if="background" :src="background" ref="backgroundImg" />
            <div v-else class="placeholder">Add image</div>
          </label>
          <label>
            <span>Scale</span>
            <input value="6" disabled />
          </label>
        </div>

        <div class="section">
          <h3>Details</h3>

          <label>
            <span>Name</span>
            <input autofocus v-model="name" />
          </label>
        </div>

        <button class="primary" @click="handleBuild">Build</button>
        <button class="secondary" @click="onBack">Back</button>
      </section>
      <section class="preview">
        <p class="description">
          Build your own map by drawing a terrain and background image. All
          opaque pixels on the terrain will be used as collision map for the
          level.
        </p>
        <img v-if="background" :src="background" />
        <img v-if="terrain" :src="terrain" />
      </section>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.background {
  height: 100%;
  background: #b5a78a;
}

.builder {
  height: 100%;
  display: flex;

  .controls {
    width: 200px;
    border: 4px solid #433e34;
    border-radius: 10px;
    padding: 10px;

    .section {
      h3 {
        font-size: 32px;
      }

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
        border: 1px solid black;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #9c917b;
        cursor: pointer;
      }

      img {
        width: 100%;
        height: 100px;
        object-fit: cover;
        border: 1px solid black;
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
