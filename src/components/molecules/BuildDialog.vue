<script setup lang="ts">
import Dialog from "./Dialog.vue";
import BuildForm from "./BuildForm.vue";

const { open, onClose, onBuilt } = defineProps<{
  open: boolean;
  onClose: () => void;
  onBuilt?: () => void;
}>();

const handleBuilt = () => {
  onBuilt?.();
  onClose();
};
</script>

<template>
  <Dialog :open="open" :onClose="onClose" title="Name your map" fitContent>
    <div class="build-dialog">
      <BuildForm :active="open" :onBuilt="handleBuilt" />
    </div>
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
}
</style>
