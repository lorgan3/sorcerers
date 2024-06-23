<script setup lang="ts">
import Dialog from "../molecules/Dialog.vue";
import Input from "../atoms/Input.vue";
import { computed, ref } from "vue";
import { IPlayer } from "../types";

const props = defineProps<{
  player: IPlayer;
  onClose: () => void;
  onSave: (name: string, characters: string[]) => void;
}>();

const name = ref(props.player.name);
const characters = ref(props.player.team.getLimitedCharacters());

const nameValidator = (text: string) => !!text.trim();
const disabled = computed(
  () => !nameValidator(name.value) || !characters.value.every(nameValidator)
);

const handleSave = () => {
  if (disabled.value) {
    return;
  }

  props.onSave(name.value, characters.value);
};
</script>

<template>
  <Dialog open :onClose="props.onClose" title="Edit player">
    <div class="inputs">
      <Input
        autofocus
        v-model="name"
        label="Player name"
        :validator="nameValidator"
      />
      <label class="character-input">
        <span class="label">Characters</span>
        <ul class="character-list">
          <li v-for="i in characters.length">
            <Input v-model="characters[i - 1]" :validator="nameValidator" />
          </li>
        </ul>
      </label>
      <button class="primary" @click="handleSave" :disabled="disabled">
        Save
      </button>
    </div>
  </Dialog>
</template>

<style lang="scss" scoped>
.inputs {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 2px;
}

.character-input {
  .label {
    font-family: Eternal;
    font-size: 24px;
    color: var(--primary);
  }
}

.character-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
</style>
