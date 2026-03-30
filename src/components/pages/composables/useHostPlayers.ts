import { ref } from "vue";
import { Player } from "../../../data/network/player";
import { Team } from "../../../data/team";
import { getServer } from "../../../data/context";
import { GameSettings } from "../../../util/localStorage/settings";
import { IPlayer } from "../../types";

export function useHostPlayers(
  updateLobby: () => void,
  gameSettings: { value: GameSettings }
) {
  const players = ref<Player[]>([]);
  const localPlayers = ref<string[]>([]);
  const editingPlayer = ref<IPlayer>();

  const handleAddLocalPlayer = (baseName: string) => {
    const team = Team.random(gameSettings.value.teamSize);
    const player = getServer()!.addPlayer(
      `${baseName} (${players.value?.length})`,
      team
    );
    localPlayers.value.push(player.color);
    updateLobby();
  };

  const handleKick = (index: number) => {
    const player = getServer()!.players[index];
    const localPlayerIndex = localPlayers.value.findIndex(
      (localPlayer) => localPlayer === player.color
    );

    if (localPlayerIndex !== -1) {
      localPlayers.value.splice(localPlayerIndex, 1);
    }

    getServer()!.kick(getServer()!.players[index]);
    updateLobby();
  };

  const handleEditPlayer = (player: IPlayer) => {
    editingPlayer.value = player;
  };

  const handleClose = () => {
    editingPlayer.value = undefined;
    updateLobby();
  };

  const handleSave = (name: string, characters: string[]) => {
    (editingPlayer.value as Player).rename(
      name,
      Team.fromJson(characters, gameSettings.value.teamSize)
    );

    editingPlayer.value = undefined;
    updateLobby();
  };

  return {
    players,
    localPlayers,
    editingPlayer,
    handleAddLocalPlayer,
    handleKick,
    handleEditPlayer,
    handleClose,
    handleSave,
  };
}
