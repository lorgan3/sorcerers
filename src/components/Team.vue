<script setup lang="ts">
import { ref } from "vue";
import { get, set } from "../util/localStorage";
import { defaults } from "../util/localStorage/settings";
import { Team } from "../data/team";

const { onBack } = defineProps<{
  onBack: () => void;
}>();

const settings = get("Settings") || defaults();

const teams = ref(settings.teams);

const handleAddTeam = () => {
  teams.value.push(Team.empty());

  requestAnimationFrame(() => {
    const elements = document.getElementsByName(`name`);
    elements[elements.length - 1].focus();
  });
};

const handleRemoveTeam = (index: number) => {
  teams.value.splice(index, 1);
};

const handleSave = () => {
  set("Settings", {
    ...settings,
    teams: teams.value.filter((team) => team.isValid()) as Team[],
  });

  onBack();
};
</script>

<template>
  <div class="background">
    <h1>Teams</h1>
    <div class="teams">
      <div
        v-for="(team, index) in teams"
        :class="{ team: true, 'flex-list': true, invalid: !team.isValid() }"
      >
        <button
          v-if="teams.length > 1"
          class="close-button"
          @click="handleRemoveTeam(index)"
        >
          ✖️
        </button>
        <label name="name">
          Name
          <input v-model="teams[index].name" />
        </label>
        <label>
          Characters
          <ul>
            <li v-for="(_, i) in team.characters">
              <input v-model="team.characters[i]" />
            </li>
          </ul>
        </label>
      </div>
    </div>

    <div class="buttons">
      <button @click="handleAddTeam" class="primary">Add team</button>
      <button @click="handleSave" class="primary">Save</button>
      <button @click="onBack" class="secondary">Back</button>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.background {
  height: 100%;
  background: #b5a78a;

  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 30px;
}

.teams {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;

  .team {
    background: #9c917b;
    padding: 25px;
    border-radius: 5px;
    position: relative;
    box-shadow: 0 0 10px inset #433e34;

    &.invalid {
      box-shadow: 0 0 10px inset #ff0000;
    }

    label {
      display: flex;
      justify-content: space-between;
      gap: 6px;
    }

    .close-button {
      position: absolute;
      right: 0;
      top: 0;
      background: none;
      border: none;
      margin: 0;
      padding: 0;
      cursor: pointer;
      font-size: 18px;
    }
  }
}

.buttons {
  display: flex;
  gap: 10px;
}
</style>
