<script setup lang="ts">
import book from "../assets/book.png";
import { RouterLink } from "vue-router";
</script>

<template>
  <div class="mainMenu">
    <ul class="list flex-list">
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
      <li>
        <RouterLink to="/credits" v-slot="{ navigate }">
          <button class="primary" @click="navigate">Credits</button>
        </RouterLink>
      </li>
      <li>
        <a
          href="https://github.com/lorgan3/sorcerers"
          target="_blank"
          rel="noopener noreferrer"
        >
          <button class="primary">
            Issues/Feedback
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              class="github-icon"
            >
              <path
                fill="currentColor"
                d="M6 2h12v2H6V2Zm4 12H8v-2h2v2Zm4 0v2h-4v-2h4Zm0 0v-2h2v2h-2Z"
              />
              <path
                fill="currentColor"
                d="M6 6V4H4v2H2v12h2v2h2v2h12v-2h2v-2h2V6h-2V4h-2v2h-2v2H8V6H6Zm2 6v-2h8v2h2V6h2v12h-2v2h-2v-4h-2v4h-4v-4H6v2h2v2H6v-2H4v-2h2v-2H4V6h2v6h2Z"
              />
            </svg>
          </button>
        </a>
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
      position: relative;
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

.github-icon {
  width: 22px;
  position: absolute;
  right: 6px;
  top: 12px;
}
</style>
