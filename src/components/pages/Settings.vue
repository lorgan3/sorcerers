<script setup lang="ts">
import { useRouter } from "vue-router";
import { defaults } from "../../util/localStorage/settings";
import { get, set } from "../../util/localStorage";
import { ref } from "vue";
import { Music, playMusic, setVolume } from "../../sound";

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
  playMusic(Music.TitleScreen);
};
</script>

<template>
  <div class="settings">
    <section class="settings-section">
      <h2 class="section-heading">Audio</h2>
      <div class="settings-group">
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
      </div>
    </section>

    <section class="settings-section">
      <h2 class="section-heading">Gameplay</h2>
      <div class="settings-group">
        <label class="input-label checkbox-label">
          <input type="checkbox" v-model="showTutorial" />
          <span class="checkmark"></span>
          <span class="label">Show tutorial</span>
        </label>
      </div>
    </section>

    <div class="buttons">
      <button @click="handleSave" class="primary">Save</button>
      <button @click="handleBack" class="secondary">Back</button>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.slider {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 6px;
  border-radius: 3px;
  background: linear-gradient(180deg, #a89070, #b8a080);
  border: 1px solid var(--border-accent-faint);
  box-shadow: inset 0 1px 2px rgba(30, 15, 5, 0.2);
  outline: none;
}

.slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: linear-gradient(180deg, var(--parchment-light), var(--parchment-dark));
  border: 2px solid var(--border-accent);
  box-shadow: 0 1px 3px rgba(30, 15, 5, 0.3);
  cursor: pointer;
  transition: box-shadow 0.3s ease;
}

.slider::-webkit-slider-thumb:hover {
  box-shadow: 0 1px 3px rgba(30, 15, 5, 0.3), 0 0 8px var(--glow-warm);
}

.slider::-moz-range-thumb {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: linear-gradient(180deg, var(--parchment-light), var(--parchment-dark));
  border: 2px solid var(--border-accent);
  box-shadow: 0 1px 3px rgba(30, 15, 5, 0.3);
  cursor: pointer;
  transition: box-shadow 0.3s ease;
}

.slider::-moz-range-thumb:hover {
  box-shadow: 0 1px 3px rgba(30, 15, 5, 0.3), 0 0 8px var(--glow-warm);
}

.settings {
  max-width: 400px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.settings-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.settings-group {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding-left: 8px;
}

.buttons {
  display: flex;
  gap: 8px;
  align-items: center;
}
</style>
