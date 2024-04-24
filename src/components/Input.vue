<script setup lang="ts" generic="V">
import { ref } from "vue";

const {
  label,
  modelValue,
  validator,
  value,
  autofocus,
  disabled,
  change,
  name,
  min,
} = defineProps<{
  label?: string;
  modelValue?: V;
  value?: V;
  validator?: (value: V) => boolean;
  autofocus?: boolean;
  disabled?: boolean;
  change?: (event: Event) => void;
  name?: string;
  min?: number;
  max?: number;
}>();

const emit = defineEmits<{
  "update:modelValue": [string | number];
}>();

const valid = ref(true);
const isNumeric = typeof (modelValue ?? value) === "number";

const handleInput = (event: Event) => {
  const newValue = isNumeric
    ? (event.target as HTMLInputElement).valueAsNumber
    : (event.target as HTMLInputElement).value;

  if (validator) {
    valid.value = validator(newValue as V);
  }

  emit("update:modelValue", newValue);
};
</script>

<template>
  <label class="wrapper">
    <span v-if="label" class="label">{{ label }}</span>
    <input
      :class="{ input: true, 'input--invalid': !valid }"
      @input="handleInput"
      :value="modelValue ?? value"
      :autofocus="autofocus"
      :disabled="disabled"
      @change="change"
      :name="name"
      :type="isNumeric ? 'number' : 'text'"
      :min="min"
    />
  </label>
</template>

<style lang="scss" scoped>
.wrapper {
  display: flex;
  flex-direction: column;
  gap: 3px;

  .label {
    font-family: Eternal;
    font-size: 24px;
    color: var(--primary);
  }

  .input {
    background: var(--background);
    box-shadow: 0 0 10px inset var(--primary);
    padding: 10px;
    border-radius: var(--small-radius);
    outline: none;
    border: none;
    transition: box-shadow 0.25s;

    &--invalid {
      box-shadow: 0 0 10px inset var(--primary), 0 0 0 3px var(--highlight);
    }
  }
}
</style>
