<script setup lang="ts">
export type DescriptionTopic =
  | "terrain"
  | "wallmask"
  | "background"
  | "overlays"
  | "advanced"
  | "publishing";

defineProps<{ topic: DescriptionTopic }>();
</script>

<template>
  <p v-if="topic === 'terrain'">
    A map needs at least a terrain to be playable. The terrain is the layer that
    can be blown up and by default this is what the sorcerers stand on. At the
    default scale (6x6), a character is 6 pixels wide and 16 pixels high. They
    can jump about 21 pixels high. You can use this template
    <img src="../../assets/mask.png" alt="Mask" title="Mask" /> when making the
    basic outline of your map to make sure the scale is correct. Generally the
    height of an area should be a lot higher than 21 pixels to prevent it from
    feeling cramped.
  </p>

  <p v-else-if="topic === 'wallmask'">
    In the advanced settings you can enable the wallmask, this will overwrite the
    default wallmask that gets generated from the terrain. You can use this
    feature if you want to add things to your map that can be blown up but not
    collide with the sorcerers. You can also use it for example for stairs that
    have distinct steps but a smooth diagonal wallmask so it can be scaled
    without jumping. The wallmask is always 6x6 so it will have to be scaled down
    if you use a smaller scale (eg if you have a terrain that's 600 pixels wide
    on scale 3, the wallmask should be scaled down 50% to 300 pixels to match).
    Because the wallmask is not shown to the player this image can be black +
    transparent to reduce the file size.
  </p>

  <p v-else-if="topic === 'background'">
    The background is placed behind the sorcerers and can't be blown up. It can
    be used to show where the terrain used to be after it has been blown up and
    to add some more detail to the map. Typically the colors used for the
    background are less saturated so it's clear what's part of the terrain and
    what is not. The sky does not need to be part of the background, you can use
    a built in parallax background for this in the advanced settings.
  </p>

  <p v-else-if="topic === 'overlays'">
    Overlays are drawn on top of the sorcerers and become transparent for
    sorcerers intersecting them. This means the image should fit the content
    closely and generally be fairly rectangular. Overlays can be dragged in the
    right position after adding. They can be used for sorcerers to hide behind
    and can get blown up like the terrain.
  </p>

  <ul v-else-if="topic === 'advanced'">
    <li>
      <h4>Scale</h4>
      <p>
        The scale is the resolution of the map, a smaller scale can be used to
        add more detail to the map. Keep in mind that collisions (the wallmask)
        are always at the 6x6 scale. For this reason multiples of 6 (6, 3, 2, 1)
        are preferred. It is recommended to first plan out the layout of your map
        at the 6x6 scale and then scale it up if you want to work at a higher
        resolution.
      </p>
    </li>
    <li>
      <h4>Spawn area</h4>
      <p>
        The spawn area can either be changed from the advanced settings or by
        dragging the red box in the builder. The spawn area dictates where
        sorcerers can spawn at the start of the game.
      </p>
    </li>
    <li>
      <h4>Parallax background & vertical offset</h4>
      <p>
        A parallax background adds some more depth to the game by making details
        in the distance move slower than details closer by. The vertical offset
        can be used to move the still layers up or down. If you wish to add your
        own parallax background, pull requests are welcome! Take a look at
        <code>src/data/map/background.ts</code> to see how they're configured.
      </p>
    </li>
  </ul>

  <p v-else-if="topic === 'publishing'">
    If you made a cool map that you want to share, feel free to make a pull
    request to add it to the game (See
    <code>src/util/assets/constants.ts</code>). If you do not know how to use git
    you can also
    <a
      href="https://github.com/lorgan3/sorcerers/issues"
      target="_blank"
      rel="noopener noreferrer"
      >open an issue</a
    >
    so someone else can add it for you. All reasonable maps will be accepted, if
    you have a crazy idea consider contacting me first if you want to ensure it
    can get added to the game.<br />
    Please optimize the images first (eg
    <a
      href="https://imageoptim.com/mac"
      target="_blank"
      rel="noopener noreferrer"
      >imageOptim</a
    >) before compiling the final version of your map, this can easily cut the
    filesize in half.
  </p>
</template>

<style lang="scss" scoped>
ul {
  margin-left: 10px;
}

h4 {
  margin-top: 10px;
}

code {
  font-family: monospace;
  font-size: 14px;
}
</style>
