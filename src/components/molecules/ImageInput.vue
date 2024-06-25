<script setup lang="ts">
import { ref } from "vue";
import eye from "pixelarticons/svg/eye.svg";
import eyeClosed from "pixelarticons/svg/eye-closed.svg";
import close from "pixelarticons/svg/close.svg";
import IconButton from "../atoms/IconButton.vue";

const { name, modelValue, onAdd, clearable, onClear, onToggleVisibility } =
  defineProps<{
    name: string;
    modelValue: string;
    onAdd?: (file: File, data: string) => void;
    onClear?: () => void;
    clearable?: boolean;
    onToggleVisibility?: (visible: boolean) => void;
  }>();

const emit = defineEmits<{
  "update:modelValue": [string];
}>();

const visible = ref(true);

const handleAdd = (event: Event) => {
  const file = (event.target as HTMLInputElement).files![0];

  if (!file) {
    return;
  }

  var reader = new FileReader();
  reader.readAsDataURL(file);
  reader.onload = () => {
    const result = reader.result as string;

    emit("update:modelValue", result);

    if (onAdd) {
      onAdd(file, result);
    }
  };
};

const handleToggleVisibility = () => {
  visible.value = !visible.value;
  onToggleVisibility!(visible.value);
};

const handleClear = () => {
  emit("update:modelValue", "");

  if (onClear) {
    onClear();
  }
};
</script>

<template>
  <div>
    <h3 class="image-select-title">
      {{ name }}
      <span class="image-select-buttons" v-if="modelValue">
        <IconButton
          v-if="onToggleVisibility"
          :onClick="handleToggleVisibility"
          :icon="visible ? eye : eyeClosed"
          :hoverIcon="visible ? eyeClosed : eye"
          :title="visible ? 'Hide' : 'Show'"
        />
        <IconButton
          v-if="clearable"
          :onClick="handleClear"
          :icon="close"
          title="Clear"
        />
      </span>
    </h3>
    <label class="image-select">
      <input hidden type="file" @change="handleAdd" accept="image/*" />
      <img v-if="modelValue" :src="modelValue" />
      <div v-else class="placeholder">➕ Add {{ name }}</div>
    </label>
  </div>
</template>

<style lang="scss" scoped>
.image-select-title {
  display: flex;
  justify-content: space-between;
  margin-bottom: 3px;
}

.image-select {
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
</style>
