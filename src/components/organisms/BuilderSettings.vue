<script setup lang="ts">
import Dialog from "../molecules/Dialog.vue";
import Input from "../atoms/Input.vue";
import { BBox } from "../../data/map/bbox";
import { ref, watch } from "vue";
import Tooltip from "../atoms/Tooltip.vue";
import { CONFIGS } from "../../data/map/background";

export interface AdvancedSettings {
  bbox: BBox;
  scale: number;
  customMask: boolean;
  parallaxName: string;
  parallaxOffset: number;
}

const { settings, onClose } = defineProps<{
  settings: AdvancedSettings;
  onClose: (settings: AdvancedSettings) => void;
}>();

const oldScale = ref(settings.scale);
watch(
  () => settings.scale,
  (scale) => {
    if (typeof scale === "number") {
      settings.bbox = settings.bbox.withScale(scale / oldScale.value);
      oldScale.value = scale;
    }
  }
);

const handleClose = () => {
  onClose(settings);
};
</script>

<template>
  <Dialog open :onClose="handleClose" title="Advanced settings">
    <div class="inputs">
      <Input label="Scale" autofocus v-model="settings.scale" :min="1" />
      <span></span>
      <Input
        label="Spawn area left"
        v-model="settings.bbox.left"
        :max="settings.bbox.right"
      />
      <Input
        label="Spawn area top"
        v-model="settings.bbox.top"
        :max="settings.bbox.bottom"
      />
      <Input
        label="Spawn area right"
        v-model="settings.bbox.right"
        :min="settings.bbox.left"
      />
      <Input
        label="Spawn area bottom"
        v-model="settings.bbox.bottom"
        :min="settings.bbox.top"
      />

      <label class="input-label">
        <span class="label">Parallax background </span>
        <select
          v-model="settings.parallaxName"
          @change="(event) => settings.parallaxName = (event.target as HTMLSelectElement).value"
        >
          <option value="">Blank</option>
          <option v-for="(_, key) in CONFIGS" :value="key">
            {{ key }}
          </option>
        </select>
      </label>
      <Input
        type="number"
        label="vertical offset"
        v-model="settings.parallaxOffset"
      />

      <label class="input-label checkbox-label">
        <input type="checkbox" v-model="settings.customMask" />
        <span class="checkmark"></span>
        <Tooltip
          text="Overwrite the default wallmask that is generated from the terrain. The wallmask is always in 6x6 scale"
          direction="center-right"
          to="#dialog"
        >
          <span class="label">Customize wallmask</span>
        </Tooltip>
      </label>
    </div>
  </Dialog>
</template>

<style lang="scss" scoped>
.inputs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
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

select {
  background: var(--background);
  box-shadow: 0 0 10px inset var(--primary);
  height: 35px;
  border-radius: var(--small-radius);
  outline: none;
}
</style>
