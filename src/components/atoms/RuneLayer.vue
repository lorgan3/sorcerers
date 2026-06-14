<script setup lang="ts">
import arcane from "../../assets/icons/arcane_bright.png";
import elemental from "../../assets/icons/elemental_bright.png";
import life from "../../assets/icons/life_bright.png";
import physical from "../../assets/icons/physical_bright.png";

const glyphs = [
  { src: arcane, style: { top: "7%", right: "6%", animationDelay: "0s" } },
  { src: elemental, style: { top: "31%", right: "15%", animationDelay: "0.9s" } },
  { src: life, style: { top: "56%", right: "8%", animationDelay: "1.7s" } },
  { src: physical, style: { top: "79%", right: "17%", animationDelay: "2.3s" } },
];
</script>

<template>
  <div class="rune-layer" aria-hidden="true">
    <img v-for="glyph in glyphs" :key="glyph.src" :src="glyph.src" class="glyph" :style="glyph.style" />
  </div>
</template>

<style lang="scss" scoped>
.rune-layer {
  position: absolute;
  inset: 0;
  pointer-events: none;

  .glyph {
    position: absolute;
    scale: 2;
    image-rendering: pixelated;
    // `backwards` holds the first keyframe during the staggered delay so the
    // glyphs don't flash from their base style before the animation starts.
    animation: rune-glow 2.8s ease-in-out infinite backwards;
  }
}

@keyframes rune-glow {
  0%,
  100% {
    filter: drop-shadow(0 0 2px var(--glow-mystic-soft));
    opacity: 0.4;
  }
  50% {
    filter: drop-shadow(0 0 9px var(--glow-mystic));
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .rune-layer .glyph {
    animation: none;
    opacity: 0.5;
  }
}
</style>
