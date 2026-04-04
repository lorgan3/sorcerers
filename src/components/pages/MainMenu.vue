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
        <RouterLink to="/host" class="primary menu-button">Host</RouterLink>
      </li>
      <li>
        <button class="primary menu-button" @click="joinDialogOpen = true">
          Join game
        </button>
      </li>
      <li>
        <RouterLink to="/builder" class="primary menu-button">Builder</RouterLink>
      </li>
      <li>
        <RouterLink to="/credits" class="primary menu-button">Credits</RouterLink>
      </li>
      <li>
        <a
          href="https://github.com/lorgan3/sorcerers"
          target="_blank"
          rel="noopener noreferrer"
          class="primary menu-button"
        >
          Issues/Feedback
          <img class="github-icon" :src="github" />
        </a>
      </li>
    </ul>
  </div>
  <div class="spellbooks">
    <Tooltip text="Spellbook" direction="top-center">
      <RouterLink to="/spellbook" class="book-link">
        <img :src="book" />
      </RouterLink>
    </Tooltip>
    <Tooltip text="Settings" direction="top-center">
      <RouterLink to="/settings" class="book-link">
        <img :src="settingsBook" />
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
    background: linear-gradient(180deg, var(--parchment-light), var(--parchment-dark));
    border: 2px solid var(--border-accent);
    box-shadow: 0 2px 8px rgba(30, 15, 5, 0.3), inset 0 0 15px rgba(180, 120, 40, 0.08);
    padding: 30px;
    border-radius: 4px;

    .menu-button {
      display: block;
      width: 100%;
      min-width: 400px;
      box-sizing: border-box;
      font-size: 32px;
      font-family: Eternal;
      padding: 10px;
      letter-spacing: 1.5px;
      position: relative;
      text-align: center;
      text-decoration: none;
    }
  }
}

.spellbooks {
  display: flex;

  .book-link {
    display: inline-block;
    padding: 20px 0 15px;
    width: 70px;
    cursor: pointer;
    text-decoration: none;

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
