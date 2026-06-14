<script setup lang="ts">
import { RouterView, useRoute } from "vue-router";
import { AssetsContainer } from "../util/assets/assetsContainer";
import { onMounted, onUnmounted, ref } from "vue";
import { Music, playMusic, setVolume } from "../sound";
import { defaults } from "../util/localStorage/settings";
import { get } from "../util/localStorage";
import ParticleBackground from "./atoms/ParticleBackground.vue";

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
    <ParticleBackground />
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
@use "../style/ornaments" as o;

.background {
  min-height: 100vh;
  box-sizing: border-box;
  background: url("../assets/parchment.png");
  image-rendering: pixelated;
  background-size: 256px;
  display: flex;
  flex-direction: column;
  gap: 12px;

  &--padded {
    padding: 2vmin 6vmin;
    position: relative;

    &::before {
      content: '';
      position: absolute;
      inset: 0;
      @include o.pixel-vignette;
      pointer-events: none;
      z-index: 1;
      animation: vignette-breathe 8s ease-in-out infinite;
    }
  }

  @keyframes vignette-breathe {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.85;
    }
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
      color: var(--border-accent);
      user-select: none;
      font-weight: normal;


      &--big {
        font-size: 15vw;
        letter-spacing: 0.5vw;
        background: linear-gradient(
          90deg,
          var(--primary) 0%,
          var(--primary) 35%,
          var(--highlight) 50%,
          var(--primary) 65%,
          var(--primary) 100%
        );
        background-size: 200% 100%;
        -webkit-background-clip: text;
        background-clip: text;
        color: transparent;
        animation: shimmer 10s ease-in-out infinite;
      }

      @keyframes shimmer {
        0%,
        40% {
          background-position: 100% 0;
        }
        60%,
        100% {
          background-position: -100% 0;
        }
      }
    }

    h2 {
      color: var(--border-accent);
      font-size: 28px;
    }
  }

}
</style>
