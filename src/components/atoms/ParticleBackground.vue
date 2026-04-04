<script setup lang="ts">
const PARTICLE_COUNT = 18;

const particles = Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
  id: i,
  size: 6 + Math.random() * 7,
  left: Math.random() * 100,
  top: Math.random() * 100,
  opacity: 0.35 + Math.random() * 0.3,
  duration: 20 + Math.random() * 20,
  delay: Math.random() * -40,
  xDrift: -30 + Math.random() * 60,
  yDrift: -30 + Math.random() * 60,
}));
</script>

<template>
  <div class="particle-container">
    <div
      v-for="p in particles"
      :key="p.id"
      class="particle"
      :style="{
        width: p.size + 'px',
        height: p.size + 'px',
        left: p.left + '%',
        top: p.top + '%',
        opacity: p.opacity,
        animationDuration: p.duration + 's',
        animationDelay: p.delay + 's',
        '--x-drift': p.xDrift + 'px',
        '--y-drift': p.yDrift + 'px',
      }"
    />
  </div>
</template>

<style lang="scss" scoped>
.particle-container {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  z-index: 0;
}

.particle {
  position: absolute;
  border-radius: 50%;
  background: var(--glow-warm);
  animation: float linear infinite;
}

@keyframes float {
  0%,
  100% {
    transform: translate(0, 0);
  }
  25% {
    transform: translate(var(--x-drift), calc(var(--y-drift) * -0.5));
  }
  50% {
    transform: translate(calc(var(--x-drift) * -0.5), var(--y-drift));
  }
  75% {
    transform: translate(calc(var(--x-drift) * 0.7), calc(var(--y-drift) * -0.3));
  }
}
</style>
