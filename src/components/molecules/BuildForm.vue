<script setup lang="ts">
import { ref, watch } from "vue";
import Input from "../atoms/Input.vue";
import BuilderDescription from "./BuilderDescription.vue";
import { useMapDraft } from "../../data/builder/draft";

const { active, onBack, onBuilt } = defineProps<{
  // becomes true when the form is shown; (re)seeds the name from the draft
  active: boolean;
  onBack?: () => void;
  onBuilt?: () => void;
}>();

const { name, build } = useMapDraft();
const localName = ref(name.value);

watch(
  () => active,
  (isActive) => {
    if (isActive) localName.value = name.value;
  },
  { immediate: true }
);

const handleSubmit = () => {
  name.value = localName.value;
  build();
  onBuilt?.();
};
</script>

<template>
  <form class="build-form" @submit.prevent="handleSubmit">
    <div class="description"><BuilderDescription topic="publishing" /></div>
    <Input label="Name" autofocus v-model="localName" />
    <div class="actions">
      <button v-if="onBack" type="button" class="secondary" @click="onBack">
        Back
      </button>
      <button class="primary" type="submit">Build</button>
    </div>
  </form>
</template>

<style lang="scss" scoped>
.build-form {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.description img {
  image-rendering: pixelated;
  vertical-align: middle;
}

.actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  margin-top: auto;

  // back button (when present) pinned left, build to the right
  .secondary {
    margin-right: auto;
  }
}
</style>
