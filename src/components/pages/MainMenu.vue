<script setup lang="ts">
import book from "../../assets/book.png";
import settingsBook from "../../assets/settingsBook.png";
import { RouterLink } from "vue-router";
import Tooltip from "../atoms/Tooltip.vue";
import { ref } from "vue";
import JoinDialog from "../organisms/JoinDialog.vue";
import github from "pixelarticons/svg/github-2.svg";

const joinDialogOpen = ref(false);
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
        <button class="primary" @click="joinDialogOpen = true">
          Join game
        </button>
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
            <img class="github-icon" :src="github" />
          </button>
        </a>
      </li>
    </ul>
  </div>
  <div class="spellbooks">
    <Tooltip text="Spellbook" direction="top-center">
      <RouterLink to="/spellbook" v-slot="{ navigate }">
        <button class="secondary book-link" @click="navigate">
          <img :src="book" />
        </button>
      </RouterLink>
    </Tooltip>
    <Tooltip text="Settings" direction="top-center">
      <RouterLink to="/settings" v-slot="{ navigate }">
        <button class="secondary book-link" @click="navigate">
          <img :src="settingsBook" />
        </button>
      </RouterLink>
    </Tooltip>
  </div>
  <JoinDialog
    :open="joinDialogOpen"
    :onClose="() => (joinDialogOpen = false)"
  />
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

.spellbooks {
  display: flex;

  .book-link {
    padding: 20px 0 15px;
    width: 70px;

    img {
      scale: 2;
    }
  }
}

.github-icon {
  width: 22px;
  position: absolute;
  right: 6px;
  top: 12px;
}
</style>
