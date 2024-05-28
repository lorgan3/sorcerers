<script setup lang="ts">
import book from "../assets/book.png";
import { RouterLink } from "vue-router";
</script>

<template>
  <div class="mainMenu">
    <ul class="list flex-list">
      <li>
        <RouterLink to="/team" v-slot="{ navigate }">
          <button class="primary" @click="navigate">Team</button>
        </RouterLink>
      </li>
      <li>
        <RouterLink to="/host" v-slot="{ navigate }">
          <button class="primary" @click="navigate">Host</button>
        </RouterLink>
      </li>
      <li>
        <RouterLink to="/join" v-slot="{ navigate }">
          <button class="primary" @click="navigate">Join game</button>
        </RouterLink>
      </li>
      <li>
        <RouterLink to="/builder" v-slot="{ navigate }">
          <button class="primary" @click="navigate">Builder</button>
        </RouterLink>
      </li>
    </ul>
  </div>
  <RouterLink to="/spellbook" v-slot="{ navigate }">
    <button class="secondary book-link" @click="navigate">
      <img :src="book" />
    </button>
  </RouterLink>
</template>

<style lang="scss" scoped>
.mainMenu {
  .list {
    background: var(--background);
    box-shadow: 0 0 10px inset var(--primary);
    padding: 30px;
    border-radius: 10px;

    button {
      min-width: 400px;
      max-width: 100%;
      font-size: 32px;
      padding: 10px;
      letter-spacing: 1.5px;
    }
  }
}

.book-link {
  padding: 20px 0 15px;
  width: 70px;

  img {
    scale: 2;
  }
}
</style>
