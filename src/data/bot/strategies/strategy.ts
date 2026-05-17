import { Command, CommandType, Key } from "../../controller/controller";
import { Character } from "../../entity/character";
import { getServer } from "../../context";
import { SPELLS, Spell } from "../../spells";
import { MessageType } from "../../network/types";
import { Cluster } from "../cluster";
import { Graph } from "../graph";
import { Node } from "../node";
import { Path } from "../path";
import { Pathfinding, PathResult } from "../pathfinding";
import { InvalidStrategyError } from "./invalidStrategyError";

export interface Evaluation {
  target: Cluster;
  path?: PathResult;
  to?: Node[];
  value: number;
}

enum State {
  Selecting,
  Moving,
  Casting,
  Done,
}

export abstract class Strategy {
  protected evaluations: Evaluation[] = [];
  protected evaluation: Evaluation | null = null;
  protected state: State = State.Selecting;
  private time = 0;
  private stuckCounter = 0;

  protected follower: Path | null = null;
  protected graph: Graph | null = null;

  constructor(protected character: Character) {}

  abstract evaluate(graph: Graph, targets: Character[]): void;

  getNextEvaluation() {
    // Child class should populate evaluations first.
    const from = this.graph!.getClosestNode(...this.character.bodyFootCenter);

    while (this.evaluations.length > 0) {
      const evaluation = this.evaluations.shift()!;
      const paths = evaluation
        .to!.map((to) => Pathfinding.findPath(from, to))
        .sort((a, b) => {
          if (!a.success) {
            return 1;
          }

          if (!b.success) {
            return -1;
          }

          return a.totalCost - b.totalCost;
        });

      const path = paths[0];
      if (path?.success) {
        this.evaluation = {
          target: evaluation.target,
          path,
          value: evaluation.value,
        };

        break;
      }
    }

    this.stuckCounter = 0;
    return this.evaluation;
  }

  abstract execute(dt: number): Command[] | null;

  abstract get destinationReached(): boolean;

  tick(dt: number): Command[] {
    if (this.evaluation === null) {
      throw InvalidStrategyError.becauseNoReachableTarget();
    }

    this.time += dt;

    switch (this.state) {
      case State.Selecting:
        if (this.time < 120) {
          return [{ type: CommandType.KeyDown, key: Key.Inventory }];
        }

        const server = getServer()!;
        const spell = (this.constructor as StrategyConstructor).spell;
        server.selectSpell(spell, this.character.player);
        // The SelectSpell message handler broadcasts when human clients select a spell;
        // bots bypass that path, so emit the broadcast manually so clients create their
        // own cursor in time for the Cast that follows.
        server.broadcast({
          type: MessageType.SelectSpell,
          spell: SPELLS.indexOf(spell),
          player: server.players.indexOf(this.character.player),
        });

        this.state = State.Moving;
        if (this.path.success) {
          this.follower = new Path(this.character, this.path.path);
        }
        break;

      case State.Moving:
        if (this.destinationReached) {
          this.state = State.Casting;
          break;
        }

        if (this.follower!.stuck) {
          this.stuckCounter++;
          if (this.stuckCounter > 3) {
            throw InvalidStrategyError.becausePathStuck();
          }

          // Empty path with a stuck follower can't be rebuilt — bail rather than crash.
          const lastEdge = this.path.path?.at(-1);
          if (!lastEdge) {
            throw InvalidStrategyError.becausePathNotFound();
          }

          this.evaluation!.path = Pathfinding.findPath(
            this.graph!.getClosestNode(...this.character.bodyFootCenter),
            lastEdge.to
          );

          if (this.path.success) {
            this.follower = new Path(this.character, this.path.path);
          } else {
            throw InvalidStrategyError.becausePathNotFound();
          }
        }

        return this.follower!.getCommand(dt);

      case State.Casting:
        const commands = this.execute(dt);

        if (commands) {
          return commands;
        }

        this.state = State.Done;
        break;
    }

    return [];
  }

  get path() {
    return this.evaluation!.path!;
  }

  get value() {
    return this.evaluation?.value ?? -Infinity;
  }

  hasEvaluation(): boolean {
    return this.evaluation !== null;
  }

  get target() {
    return this.evaluation!.target;
  }

  get isDone(): boolean {
    return this.state === State.Done;
  }
}

export type StrategyConstructor = (new (character: Character) => Strategy) & {
  spell: Spell;
};
