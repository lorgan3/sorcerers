<script setup lang="ts">
import { ref } from "vue";
import Dialog from "../molecules/Dialog.vue";
import Tooltip from "../atoms/Tooltip.vue";
import Input from "../atoms/Input.vue";
import { GameSettings } from "../../util/localStorage/settings";
import IconButton from "../atoms/IconButton.vue";
import edit from "pixelarticons/svg/edit.svg";

const { settings, onEdit } = defineProps<{
  settings: GameSettings;
  map?: string;
  onEdit?: (settings: GameSettings) => void;
}>();

const editedSettings = ref({ ...settings });

const isEditing = ref(false);
const handleClose = () => (isEditing.value = false);
const handleSave = () => {
  onEdit!({ ...editedSettings.value });
  isEditing.value = false;
};

const numberFormatter = new Intl.NumberFormat("en");
</script>

<template>
  <section class="game-settings">
    <h2>
      Settings
      <IconButton
        v-if="onEdit"
        title="Edit settings"
        :onClick="() => (isEditing = true)"
        :icon="edit"
      />
    </h2>

    <ul class="grid">
      <li v-if="map">
        <h3>Map</h3>
        {{ map.replace("_", " ") }}
      </li>
      <li>
        <h3>Game duration</h3>
        {{ `${numberFormatter.format(settings.gameLength)} minutes` }}
      </li>
      <li>
        <h3>Turn duration</h3>
        {{ `${numberFormatter.format(settings.turnLength)} seconds` }}
      </li>
      <li>
        <h3>Mana multiplier</h3>
        {{ `${numberFormatter.format(settings.manaMultiplier)}%` }}
      </li>
      <li>
        <h3>Item spawn chance</h3>
        {{ `${numberFormatter.format(settings.itemSpawnChance)}%` }}
      </li>
    </ul>
    <Dialog :open="isEditing" :onClose="handleClose" title="Edit settings">
      <div class="inputs">
        <Input
          label="Team size"
          v-model="editedSettings.teamSize"
          :min="1"
          :max="10"
        />
        <Input
          label="Turn duration (seconds)"
          v-model="editedSettings.turnLength"
          :min="5"
        />
        <Input
          label="Game duration (minutes)"
          v-model="editedSettings.gameLength"
          :min="0"
        />
        <Input
          label="Mana gain multiplier (pct)"
          v-model="editedSettings.manaMultiplier"
          :min="0"
          :max="2500"
        />
        <Input
          label="Item spawn chance (pct)"
          v-model="editedSettings.itemSpawnChance"
          :min="0"
          :max="400"
        />
        <label class="input-label checkbox-label">
          <input type="checkbox" v-model="editedSettings.trustClient" />
          <span class="checkmark"></span>
          <Tooltip
            text="Hides lag (ping) for players but might allow cheating"
            direction="center-right"
            to="#dialog"
          >
            <span class="label">Active player has control</span>
          </Tooltip>
        </label>

        <button class="primary" @click="handleSave">Save</button>
      </div>
    </Dialog>
  </section>
</template>

<style lang="scss" scoped>
.game-settings {
  max-width: 800px;

  .grid {
    margin-top: 10px;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px;
  }
}

.inputs {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 2px;
}
</style>
