<script setup lang="ts">
import { ref } from "vue";

import { Team } from "../data/team";
import Input from "./Input.vue";

const { modelValue, change } = defineProps<{
  modelValue: Team;
  change?: (event: Event) => void;
}>();

const team = ref(modelValue);

const emit = defineEmits<{
  "update:modelValue": [Team];
}>();

const handleChange = (event: Event) => {
  emit("update:modelValue", team.value);
  change?.(event);
};
</script>

<template>
  <div class="teams">
    <div
      :class="{
        team: true,
        'flex-list': true,
        'flex-list--wide': true,
        invalid: !team.isValid(),
      }"
    >
      <label class="character-input">
        Characters
        <ul class="character-list">
          <li v-for="i in team.size">
            <Input
              v-model="team.characters[i - 1]"
              :validator="(text: string) => !!text.trim()"
              :change="handleChange"
            />
          </li>
        </ul>
      </label>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.team {
  .character-input {
    font-family: Eternal;
    font-size: 24px;
    color: var(--primary);

    .character-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-top: 6px;
    }
  }
}

.buttons {
  display: flex;
  gap: 10px;
}
</style>
