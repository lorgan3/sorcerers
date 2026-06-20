<script setup lang="ts">
import { ref, watch } from "vue";
import Dialog from "./Dialog.vue";
import Input from "../atoms/Input.vue";
import BuilderDescription from "./BuilderDescription.vue";
import { useMapDraft } from "../../data/builder/draft";

const { open, onClose, onBuilt } = defineProps<{
  open: boolean;
  onClose: () => void;
  onBuilt?: () => void;
}>();

const { name, build } = useMapDraft();
const localName = ref(name.value);

watch(
  () => open,
  (isOpen) => {
    if (isOpen) {
      localName.value = name.value;
    }
  }
);

const handleSubmit = () => {
  name.value = localName.value;
  build();
  onBuilt?.();
  onClose();
};
</script>

<template>
  <Dialog :open="open" :onClose="onClose" title="Name your map" fitContent>
    <form class="build-dialog" @submit.prevent="handleSubmit">
      <div class="description"><BuilderDescription topic="publishing" /></div>
      <Input label="Name" autofocus v-model="localName" />
      <div class="actions">
        <button class="primary" type="submit">Build</button>
      </div>
    </form>
  </Dialog>
</template>

<style lang="scss" scoped>
/* fixed size so the build dialog matches the wizard screens */
.build-dialog {
  width: var(--wizard-body-width);
  height: var(--wizard-body-height);
  max-width: 100%;
  overflow: auto;
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
  justify-content: flex-end;
  margin-top: auto;
}
</style>
