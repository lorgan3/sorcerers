<script setup lang="ts">
import { COLORS } from "../../data/network/constants";
import IconButton from "../atoms/IconButton.vue";
import TornPanel from "../atoms/TornPanel.vue";
import { IPlayer } from "../types";
import close from "pixelarticons/svg/close.svg";

const { onDelete, onEdit, player, subTitle } = defineProps<{
  player: IPlayer;
  subTitle?: string;
  onDelete?: (player: IPlayer) => void;
  onEdit?: (IPlayer: IPlayer) => void;
}>();

// Fall back to the first frame when the colour isn't an exact COLORS match
// (e.g. a serialised colour from the network), otherwise indexOf(-1) pushes
// background-position-x off the sprite sheet and the preview renders blank.
const colorIndex = Math.max(0, COLORS.indexOf(player.color));
const offset = COLORS.length - colorIndex - 1;

const handleDelete = (event: Event) => {
  event.stopPropagation();
  onDelete!(player);
};
</script>

<template>
  <div
    :class="{ 'team-display': true, interactive: onEdit }"
    :style="{ '--team-offset': offset, '--color': player.color }"
    :is="onEdit ? 'button' : 'div'"
    @click="() => onEdit?.(player)"
  >
    <TornPanel tear="a">
      <div class="portrait" aria-hidden="true">
        <div class="sprite" />
      </div>
      <div class="header">
        <h2 class="player-name">{{ player.name }}</h2>
        <div class="buttons">
          <IconButton
            v-if="onDelete"
            title="Remove player"
            :onClick="handleDelete"
            :icon="close"
          />
        </div>
      </div>
      <span class="sub-title">{{ subTitle }}</span>
      <ul class="characters">
        <li v-for="character in player.team.getLimitedCharacters()">
          {{ character }}
        </li>
      </ul>
    </TornPanel>
  </div>
</template>

<style lang="scss" scoped>
.team-display {
  min-width: 250px;
  position: relative;
  flex: 1;
  flex-grow: 0;
  white-space: nowrap;
  transition: transform 0.3s ease;

  // Tighter inner box so the portrait can sit closer to the name.
  :deep(.content) {
    padding: 8px 10px;
  }

  &.interactive {
    cursor: pointer;

    &:hover {
      transform: translateY(-2px);
    }
  }

  // Clips the oversized portrait to TornPanel's inner frame so the artwork can
  // never poke through the border — independent of how many character rows the
  // panel ends up with (a 2-character team is much shorter than a 4-character
  // one). Sibling of the corner ornaments so those stay unclipped.
  .portrait {
    position: absolute;
    inset: 0;
    overflow: hidden;
    pointer-events: none;
  }

  // Starts below the name/subtitle so the text never sits on the artwork.
  .sprite {
    background: url("../../assets/characters.png");
    background-repeat: no-repeat;
    background-size: 500%;
    background-position-x: calc(var(--team-offset) * 25%);
    position: absolute;
    top: 18px;
    left: 50%;
    width: 100px;
    height: 200px;
    translate: -50% 0%;
  }

  .header {
    padding: 2px 4px 0;
    display: flex;
    justify-content: space-between;
    overflow: hidden;

    .player-name {
      font-size: 22px;
      line-height: 1.15;
      text-shadow: 2px 2px 2px var(--color);
      flex: 1;
      text-overflow: ellipsis;
      overflow: hidden;
    }
  }

  .sub-title {
    padding-left: 4px;
    font-size: 12px;
    line-height: 16px;
    min-height: 16px;
    display: block;
  }

  .characters {
    margin-top: 132px;
    display: grid;
    grid-template-columns: 1fr 1fr;
    position: relative;

    li {
      border: 2px solid var(--border-accent-faint);
      border-radius: 0;
      background: var(--field-bg);
      color: var(--primary);
      font-size: 14px;
      text-align: center;
      margin: 3px;
      overflow: hidden;
      text-overflow: ellipsis;
      padding: 1px 5px;
    }
  }
}
</style>
