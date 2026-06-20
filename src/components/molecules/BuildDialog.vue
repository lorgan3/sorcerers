<script setup lang="ts">
import { ref, watch } from "vue";
import Dialog from "./Dialog.vue";
import Input from "../atoms/Input.vue";
import Collapsible from "../atoms/Collapsible.vue";
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
    <div class="build-dialog">
      <form class="build-form" @submit.prevent="handleSubmit">
        <Input label="Name" autofocus v-model="localName" />
        <button class="primary" type="submit">Build</button>
      </form>
      <Collapsible title="Publishing">
        <BuilderDescription topic="publishing" />
      </Collapsible>
    </div>
  </Dialog>
</template>

<style lang="scss" scoped>
.build-dialog {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 360px;
  max-width: 100%;
}

.build-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
</style>
