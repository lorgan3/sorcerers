<script setup lang="ts">
import { RouterView, useRoute } from "vue-router";
import { AssetsContainer } from "../util/assets/assetsContainer";
import { onMounted, onUnmounted, ref } from "vue";
import { Music, playMusic, setVolume } from "../sound";
import { defaults } from "../util/localStorage/settings";
import { get } from "../util/localStorage";

const route = useRoute();
const settings = defaults(get("Settings"));
const mounted = ref(false);

onMounted(() => (mounted.value = true));
onUnmounted(() => (mounted.value = false));

AssetsContainer.instance.onComplete(() => {
  if (mounted) {
    setVolume(settings.sfxVolume, settings.musicVolume);
    playMusic(Music.TitleScreen);
  }
});
</script>

<template>
  <div class="background background--padded">
    <div class="title-wrapper">
      <RouterLink to="/" v-slot="{ navigate }">
        <h1
          :class="{ title: true, 'title--big': !route.meta.name }"
          @click="navigate"
        >
          <span>S</span>
          <span>o</span>
          <span>r</span>
          <span>c</span>
          <span>e</span>
          <span>r</span>
          <span>e</span>
          <span>r</span>
          <span>s</span>
        </h1>
      </RouterLink>
      <h2 v-if="!!route.meta.name">/ {{ route.meta.name }}</h2>
    </div>

    <RouterView />
  </div>
</template>

<style lang="scss" scoped>
.background {
  min-height: 100vh;
  box-sizing: border-box;
  background: url("../assets/parchment.png");
  image-rendering: pixelated;
  background-size: 256px;
  display: flex;
  flex-direction: column;
  gap: 20px;

  &--padded {
    box-shadow: 0 0 10vmin inset var(--primary);
    padding: 7vmin 15vmin;
  }

  .title-wrapper {
    display: flex;
    align-items: baseline;
    gap: 6px;

    a:hover {
      text-decoration: none;
    }

    .title {
      font-size: 48px;
      color: var(--primary);
      user-select: none;
      text-shadow: 0 0 0 var(--highlight);
      transition: all 0.3s linear;
      font-weight: normal;

      > * {
        transition: 1s color;

        &:hover {
          color: var(--highlight);
        }
      }

      &--big {
        font-size: 20vw;
        text-shadow: 0 0.5vw 0.5vw var(--highlight);
        letter-spacing: 0.5vw;
      }
    }
  }

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
}

.book-link {
  padding: 20px 0 15px;
  width: 70px;

  img {
    scale: 2;
  }
}
</style>
