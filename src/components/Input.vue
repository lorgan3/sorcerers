<script setup lang="ts">
import { ref } from "vue";

const { label, modelValue, validator, value, autofocus, disabled, change } =
  defineProps<{
    label?: string;
    modelValue?: string;
    value?: string;
    validator?: (value: string) => boolean;
    autofocus?: boolean;
    disabled?: boolean;
    change?: (event: Event) => void;
  }>();

const emit = defineEmits<{
  "update:modelValue": [string];
}>();

const valid = ref(true);

const handleInput = (event: Event) => {
  const value = (event.target as HTMLInputElement).value;
  if (validator) {
    valid.value = validator(value);
  }

  emit("update:modelValue", value);
};
</script>

<template>
  <label class="wrapper">
    <span v-if="label" class="label">{{ label }}</span>
    <input
      :class="{ input: true, 'input--invalid': !valid }"
      @input="handleInput"
      :value="modelValue || value"
      :autofocus="autofocus"
      :disabled="disabled"
      @change="change"
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
