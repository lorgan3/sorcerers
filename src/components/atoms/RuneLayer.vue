<script setup lang="ts">
import arcane from "../../assets/icons/arcane_bright.png";
import elemental from "../../assets/icons/elemental_bright.png";
import life from "../../assets/icons/life_bright.png";
import physical from "../../assets/icons/physical_bright.png";

const glyphs = [
  { src: arcane, style: { top: "8%", right: "4%", animationDelay: "0s" } },
  { src: elemental, style: { top: "38%", right: "12%", animationDelay: "0.9s" } },
  { src: life, style: { bottom: "18%", right: "5%", animationDelay: "1.7s" } },
  { src: physical, style: { bottom: "8%", left: "2%", animationDelay: "2.3s" } },
];
</script>

<template>
  <div class="rune-layer" aria-hidden="true">
    <img v-for="glyph in glyphs" :key="glyph.src" :src="glyph.src" class="glyph" :style="glyph.style" />
    <span class="tagline">The ink stirs as if freshly written…</span>
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
    animation: rune-glow 2.8s ease-in-out infinite;
  }

  .tagline {
    position: absolute;
    top: 0;
    left: 0;
    font-style: italic;
    color: var(--primary);
    overflow: hidden;
    white-space: nowrap;
    border-right: 2px solid var(--primary);
    animation: ink-write 6s steps(40) infinite;
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

@keyframes ink-write {
  0% {
    width: 0;
  }
  55%,
  100% {
    width: 38ch;
  }
}

@media (prefers-reduced-motion: reduce) {
  .rune-layer .glyph,
  .rune-layer .tagline {
    animation: none;
    opacity: 0.5;
    width: auto;
  }
}
</style>
