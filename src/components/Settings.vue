<script setup lang="ts">
import { useRouter } from "vue-router";
import { defaults } from "../util/localStorage/settings";
import { get, set } from "../util/localStorage";
import { ref } from "vue";
import { setVolume } from "../sound";

const router = useRouter();

const settings = defaults(get("Settings"));

const sfxVolume = ref(settings.sfxVolume);
const musicVolume = ref(settings.musicVolume);
const showTutorial = ref(!settings.tutorialDone);

const handleBack = () => {
  setVolume(settings.sfxVolume, settings.musicVolume);
  router.replace("/");
};

const handleSave = () => {
  set("Settings", {
    ...settings,
    sfxVolume: sfxVolume.value,
    musicVolume: musicVolume.value,
    tutorialDone: !showTutorial.value,
  });

  setVolume(sfxVolume.value, musicVolume.value);
  router.replace("/");
};

const handleChangeMusic = () => {
  setVolume(sfxVolume.value, musicVolume.value);
};
</script>

<template>
  <div class="flex-list">
    <label class="input-label">
      <span class="label"> SFX volume </span>
      <input
        class="slider"
        type="range"
        v-model="sfxVolume"
        min="0"
        max="1"
        step="0.01"
      />
    </label>

    <label class="input-label">
      <span class="label"> Music volume </span>
      <input
        class="slider"
        type="range"
        v-model="musicVolume"
        min="0"
        max="1"
        step="0.01"
        @change="handleChangeMusic"
      />
    </label>

    <label class="input-label checkbox-label">
      <input type="checkbox" v-model="showTutorial" />
      <span class="checkmark"></span>
      <span class="label">Show tutorial</span>
    </label>
  </div>

  <div class="buttons">
    <button @click="handleSave" class="primary">Save</button>
    <button @click="handleBack" class="secondary">Back</button>
  </div>
</template>

<style lang="scss" scoped>
.slider {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 15px;
  border-radius: 5px;
  background: var(--background);
  outline: none;
  opacity: 0.7;
  -webkit-transition: 0.2s;
  transition: opacity 0.2s;
}

.slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 25px;
  height: 25px;
  border-radius: 50%;
  background: var(--primary);
  cursor: pointer;
}

.slider::-moz-range-thumb {
  width: 25px;
  height: 25px;
  border-radius: 50%;
  background: var(--primary);
  cursor: pointer;
}

.buttons {
  display: flex;
  gap: 8px;
  align-items: center;
}
</style>
