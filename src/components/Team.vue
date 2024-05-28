<script setup lang="ts">
import { ref } from "vue";
import { get, set } from "../util/localStorage";
import { defaults } from "../util/localStorage/settings";
import { Team } from "../data/team";
import Input from "./Input.vue";
import { useRouter } from "vue-router";

const router = useRouter();
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

  router.replace("/");
};
</script>

<template>
  <div class="teams">
    <div
      v-for="(team, index) in teams"
      :class="{ team: true, 'flex-list': true, invalid: !team.isValid() }"
    >
      <button
        v-if="teams.length > 1"
        class="icon-button close-button"
        @click="handleRemoveTeam(index)"
      >
        ✖️
      </button>

      <Input
        label="Name"
        v-model="teams[index].name"
        :validator="(text: string) => !!text.trim()"
        name="name"
      />

      <label class="character-input">
        Characters
        <ul class="character-list">
          <li v-for="(_, i) in team.characters">
            <Input
              v-model="team.characters[i]"
              :validator="(text: string) => !!text.trim()"
            />
          </li>
        </ul>
      </label>
    </div>
  </div>

  <div class="buttons">
    <button @click="handleAddTeam" class="primary">Add team</button>
    <button @click="handleSave" class="primary">Save</button>
    <RouterLink to="/" v-slot="{ navigate }">
      <button @click="navigate" class="secondary">Back</button>
    </RouterLink>
  </div>
</template>

<style lang="scss" scoped>
.teams {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;

  .team {
    background: var(--background);
    padding: 25px;
    border-radius: 5px;
    position: relative;
    box-shadow: 0 0 10px inset var(--primary);
    width: 300px;
    transition: box-shadow 0.25s;

    &.invalid {
      box-shadow: 0 0 10px inset var(--highlight);
    }

    .character-input {
      font-family: Eternal;
      font-size: 24px;
      color: var(--primary);

      .character-list {
        display: flex;
        flex-direction: column;
        gap: 5px;
      }
    }

    .close-button {
      position: absolute;
      right: 5px;
      top: 5px;
    }
  }
}

.buttons {
  display: flex;
  gap: 10px;
}
</style>
