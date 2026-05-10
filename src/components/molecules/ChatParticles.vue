<script setup lang="ts">
import { ref } from "vue";
import arcane from "../../assets/icons/arcane_bright.png";
import elemental from "../../assets/icons/elemental_bright.png";
import life from "../../assets/icons/life_bright.png";
import physical from "../../assets/icons/physical_bright.png";

interface Particle {
  id: number;
  src: string;
  left: number;
  drift: number;
  rise: number;
  rotateStart: number;
  rotateEnd: number;
  duration: number;
}

const GLYPHS = [arcane, elemental, life, physical];
const MAX_LIVE = 32;

const particles = ref<Particle[]>([]);
let nextId = 0;

const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const range = (min: number, max: number) =>
  min + Math.random() * (max - min);

const emit = () => {
  const count = 6 + Math.floor(Math.random() * 3);

  for (let i = 0; i < count; i++) {
    const p: Particle = {
      id: ++nextId,
      src: pick(GLYPHS),
      left: range(20, 320),
      drift: range(-30, 30),
      rise: range(60, 110),
      rotateStart: range(-30, 30),
      rotateEnd: range(-180, 180),
      duration: range(900, 1200),
    };
    particles.value.push(p);

    while (particles.value.length > MAX_LIVE) {
      particles.value.shift();
    }

    window.setTimeout(() => {
      const idx = particles.value.findIndex((q) => q.id === p.id);
      if (idx !== -1) particles.value.splice(idx, 1);
    }, p.duration);
  }
};

defineExpose({ emit });
</script>

<template>
  <div class="chat-particles">
    <img
      v-for="p in particles"
      :key="p.id"
      :src="p.src"
      class="particle"
      :style="{
        left: p.left + 'px',
        '--drift': p.drift + 'px',
        '--rise': p.rise + 'px',
        '--rot-start': p.rotateStart + 'deg',
        '--rot-end': p.rotateEnd + 'deg',
        animationDuration: p.duration + 'ms',
      }"
    />
  </div>
</template>

<style lang="scss" scoped>
.chat-particles {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 0;
  pointer-events: none;
  overflow: visible;
}

.particle {
  position: absolute;
  top: 0;
  width: 24px;
  height: 24px;
  image-rendering: pixelated;
  pointer-events: none;
  filter: drop-shadow(0 0 4px rgba(255, 220, 140, 0.8));
  animation-name: chat-particle-rise;
  animation-timing-function: ease-out;
  animation-fill-mode: forwards;
  transform-origin: center;
}

@keyframes chat-particle-rise {
  0% {
    opacity: 0;
    transform: translate(0, 0) rotate(var(--rot-start));
  }
  20% {
    opacity: 1;
  }
  100% {
    opacity: 0;
    transform: translate(var(--drift), calc(-1 * var(--rise))) rotate(var(--rot-end));
  }
}
</style>
