<script setup lang="ts">
import { ref } from "vue";
import eye from "pixelarticons/svg/eye.svg";
import eyeClosed from "pixelarticons/svg/eye-closed.svg";
import close from "pixelarticons/svg/close.svg";
import IconButton from "../atoms/IconButton.vue";

const {
  name,
  modelValue,
  onAdd,
  clearable,
  onClear,
  onToggleVisibility,
  defaultHidden,
  hideTitle,
} = defineProps<{
  name: string;
  modelValue: string;
  onAdd?: (file: File, data: string) => void;
  onClear?: () => void;
  clearable?: boolean;
  onToggleVisibility?: (visible: boolean) => void;
  defaultHidden?: boolean;
  hideTitle?: boolean;
}>();

const emit = defineEmits<{
  "update:modelValue": [string];
}>();

const visible = ref(!defaultHidden);
const active = ref(false);

const add = (file?: File) => {
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

const handleAdd = (event: Event) => {
  const file = (event.target as HTMLInputElement).files![0];
  add(file);

  (event.target as HTMLInputElement).value = "";
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

function handleDrop(event: DragEvent) {
  event.preventDefault();

  if (!event.dataTransfer) {
    return;
  }

  add(event.dataTransfer.files[0]);
}

function handleDragOver(event: DragEvent) {
  event.preventDefault();

  if (!event.dataTransfer) {
    return;
  }

  active.value = [...event.dataTransfer.items].some(
    (item) => item.kind === "file"
  );
}

function handleDragLeave() {
  active.value = false;
}
</script>

<template>
  <div>
    <h3 v-if="!hideTitle" class="image-select-title">
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
    <label
      :class="{ 'image-select': true, 'image-select--active': active }"
      @drop="handleDrop"
      @dragover="handleDragOver"
      @dragleave="handleDragLeave"
    >
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
    background: linear-gradient(180deg, var(--parchment-light), var(--parchment-dark));
    cursor: pointer;
    border: 1px solid var(--border-accent-faint);
    border-radius: var(--small-radius);
    box-shadow: inset 0 1px 3px rgba(30, 15, 5, 0.1);
    transition: border-color 0.3s ease, box-shadow 0.3s ease;

    &:hover {
      border-color: var(--border-accent);
      box-shadow: inset 0 1px 3px rgba(30, 15, 5, 0.1), 0 0 8px var(--glow-warm-soft);
    }
  }

  img {
    width: 100%;
    height: 100px;
    object-fit: cover;
    border: 1px solid var(--border-accent-faint);
    border-radius: var(--small-radius);
    box-shadow: 0 1px 4px rgba(30, 15, 5, 0.2);
    cursor: pointer;
    transition: border-color 0.3s ease, box-shadow 0.3s ease;

    &:hover {
      object-fit: contain;
      border-color: var(--border-accent);
      box-shadow: 0 1px 4px rgba(30, 15, 5, 0.2), 0 0 8px var(--glow-warm-soft);
    }
  }

  &--active {
    .placeholder,
    img {
      border-color: var(--border-accent-hover);
      box-shadow: 0 0 10px var(--glow-warm);
    }
  }
}
</style>
