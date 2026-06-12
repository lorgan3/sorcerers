<script setup lang="ts">
import book from "../../assets/book.png";
import settingsBook from "../../assets/settingsBook.png";
import { RouterLink } from "vue-router";
import Tooltip from "../atoms/Tooltip.vue";
import { ref } from "vue";
import JoinDialog from "../organisms/JoinDialog.vue";
import ServerList from "../organisms/ServerList.vue";
import externalLink from "pixelarticons/svg/external-link.svg";
import TornPanel from "../atoms/TornPanel.vue";
import WaxSeal from "../atoms/WaxSeal.vue";
import RuneLayer from "../atoms/RuneLayer.vue";

const joinDialogOpen = ref(false);
</script>

<template>
  <RuneLayer />
  <div class="main-menu-row">
    <TornPanel class="menu-panel">
      <ul class="list flex-list">
        <li>
          <RouterLink to="/host" class="primary menu-button"
            >Host<WaxSeal class="seal" letter="S" :size="34" aria-hidden="true"
          /></RouterLink>
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
            <img class="github-icon" :src="externalLink" />
          </a>
        </li>
      </ul>
    </TornPanel>
    <ServerList />
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
.main-menu-row {
  display: flex;
  align-items: flex-start;
  gap: 30px;
  flex-wrap: wrap;
}

.menu-panel {
  width: fit-content;

  .list {
    padding: 6px;

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

    .seal {
      position: absolute;
      right: -12px;
      top: -12px;
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
      transition: filter 0.3s ease;
    }

    &:hover img {
      filter: drop-shadow(0 0 6px var(--glow-warm));
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
