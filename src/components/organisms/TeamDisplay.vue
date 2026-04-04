<script setup lang="ts">
import { COLORS } from "../../data/network/constants";
import IconButton from "../atoms/IconButton.vue";
import { IPlayer } from "../types";
import close from "pixelarticons/svg/close.svg";

const { onDelete, onEdit, player, subTitle } = defineProps<{
  player: IPlayer;
  subTitle?: string;
  onDelete?: (player: IPlayer) => void;
  onEdit?: (IPlayer: IPlayer) => void;
}>();

const offset = COLORS.length - COLORS.indexOf(player.color) - 1;

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
    <span v-if="subTitle" class="sub-title">{{ subTitle }}</span>
    <ul class="characters">
      <li v-for="character in player.team.getLimitedCharacters()">
        {{ character }}
      </li>
    </ul>
  </div>
</template>

<style lang="scss" scoped>
.team-display {
  min-width: 250px;
  border: 2px solid var(--border-accent);
  position: relative;
  box-shadow: 0 2px 8px rgba(30, 15, 5, 0.3);
  border-radius: 4px;
  flex: 1;
  flex-grow: 0;
  background: linear-gradient(180deg, var(--parchment-light), var(--parchment-dark));
  overflow: hidden;
  white-space: nowrap;
  transition: box-shadow 0.3s ease, transform 0.3s ease;

  &.interactive {
    cursor: pointer;

    &:hover {
      box-shadow: 0 2px 8px rgba(30, 15, 5, 0.3), 0 0 12px var(--glow-warm-soft);
      transform: translateY(-2px);
    }
  }

  &:before {
    background: url("../../assets/characters.png");
    background-repeat: no-repeat;
    background-size: 500%;
    background-position-x: calc(var(--team-offset) * 25%);
    content: "";
    display: block;
    position: absolute;
    top: 0;
    left: 50%;
    width: 100px;
    height: 200px;
    translate: -50% 0%;
  }

  .header {
    padding: 5px 5px 0;
    display: flex;
    justify-content: space-between;
    overflow: hidden;

    .player-name {
      text-shadow: 2px 2px 2px var(--color);
      flex: 1;
      text-overflow: ellipsis;
      overflow: hidden;
    }
  }

  .sub-title {
    padding-left: 5px;
    font-size: 12px;
    display: block;
    position: absolute;
  }

  .characters {
    margin-top: 120px;
    display: grid;
    grid-template-columns: 1fr 1fr;
    position: relative;

    li {
      border: 1px solid var(--border-accent-faint);
      background: linear-gradient(180deg, var(--background), var(--background-dark));
      border-radius: var(--big-radius);
      text-align: center;
      margin: 3px;
      overflow: hidden;
      text-overflow: ellipsis;
      padding: 0 5px;
    }
  }
}
</style>
