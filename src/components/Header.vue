<script setup lang="ts">
import { RouterView, useRoute } from "vue-router";

const route = useRoute();
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
    padding: 10vmin 15vmin;
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
