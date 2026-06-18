<script setup lang="ts">
import { ref, watch } from "vue";
import Dialog from "./Dialog.vue";
import Input from "../atoms/Input.vue";
import { useMapDraft } from "../../data/builder/draft";

const { open, onClose } = defineProps<{
  open: boolean;
  onClose: () => void;
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
  onClose();
};
</script>

<template>
  <Dialog :open="open" :onClose="onClose" title="Name your map" fitContent>
    <form class="build-form" @submit.prevent="handleSubmit">
      <Input label="Name" autofocus v-model="localName" />
      <button class="primary" type="submit">Build</button>
    </form>
  </Dialog>
</template>

<style lang="scss" scoped>
.build-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 260px;
}
</style>
