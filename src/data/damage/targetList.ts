import { Character } from "../character";
import { Manager } from "../network/manager";

export interface Force {
  direction: number;
  power: number;
}

export interface Target {
  player: number;
  character: number;
  damage: number;
  force?: Force;
}

export class TargetList {
  constructor(private targets: Target[] = []) {}

  add(character: Character, damage: number, force?: Force) {
    this.targets.push({
      player: Manager.instance.players.indexOf(character.player),
      character: character.player.characters.indexOf(character),
      damage,
      force,
    });

    return this;
  }

  damage() {
    for (let target of this.targets) {
      Manager.instance.players[target.player].characters[
        target.character
      ].damage(target.damage, target.force);
    }
  }

  serialize() {
    return this.targets.map((target) =>
      target.force && target.force.power !== 0
        ? [
            target.player,
            target.character,
            target.damage,
            target.force.power,
            target.force.direction,
          ]
        : [target.player, target.character, target.damage, 0]
    );
  }

  static deserialize(data?: ReturnType<TargetList["serialize"]>) {
    if (!data) {
      return new TargetList();
    }

    return new TargetList(
      data.map((target) =>
        target[3]
          ? {
              player: target[0],
              character: target[1],
              damage: target[2],
              force: { power: target[3], direction: target[4] },
            }
          : { player: target[0], character: target[1], damage: target[2] }
      )
    );
  }
}
