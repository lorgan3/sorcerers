import { LIGHTNING, getSpellCost } from "../../spells";
import { getLevel, getManager } from "../../context";
import { Character } from "../../entity/character";
import { Element } from "../../spells/types";
import { Cluster } from "../cluster";
import { Graph } from "../graph";
import { Evaluation } from "./strategy";
import { ChargedHoldReleaseCast } from "./chargedHoldReleaseCast";
import { hasLineOfSight, predictChainTargets, scoreCandidate } from "./scoring";

const HOLD_TICKS = 35;
const CHAIN_RANGE_SCREEN = 260;
const MAX_CHAINS = 5;
// Same value as CHAIN_RANGE_SCREEN: the first hop uses the same range as later hops.
const MAX_RANGE_SCREEN = 260;

export class Lightning extends ChargedHoldReleaseCast {
  public static spell = LIGHTNING;

  protected readonly holdTicks = HOLD_TICKS;

  protected aimPoint(): [number, number] {
    return this.evaluation!.target.centerScreen;
  }

  static predictPerTarget(elementalValue: number): number {
    return 20 + elementalValue * 5;
  }

  evaluate(graph: Graph, targets: Character[]) {
    this.graph = graph;
    const myCenter = this.character.getCenter();
    const myNode = graph.getClosestNode(...this.character.bodyFootCenter);
    const surface = getLevel().terrain.collisionMask;
    const currentMana = this.character.player.mana;
    const perTarget = Lightning.predictPerTarget(
      getManager().getElementValue(Element.Elemental),
    );

    const enemies: Character[] = [];
    getLevel().withNearbyEntities(
      myCenter[0],
      myCenter[1],
      CHAIN_RANGE_SCREEN * MAX_CHAINS,
      (entity) => {
        if (entity instanceof Character && entity.player !== this.character.player) {
          enemies.push(entity);
        }
      },
    );

    this.evaluations = targets
      .slice(0, 3)
      .map((target) => {
        const targetCenter = target.getCenter();
        const dx = targetCenter[0] - myCenter[0];
        const dy = targetCenter[1] - myCenter[1];
        if (Math.sqrt(dx * dx + dy * dy) > MAX_RANGE_SCREEN) return null;
        if (!hasLineOfSight(surface, myCenter, targetCenter)) return null;

        // Chains start at the primary target and hop to other nearby enemies.
        // +1 counts the primary target; MAX_CHAINS - 1 caps the hops that follow it,
        // keeping total hits within the spell's chain limit.
        const otherEnemies = enemies
          .filter((e) => e !== target)
          .map((e) => e.getCenter());
        const hits =
          predictChainTargets(targetCenter, otherEnemies, CHAIN_RANGE_SCREEN, MAX_CHAINS - 1) + 1;
        const enemyDamage = perTarget * hits;

        // Chains can hit allies, but ally damage and kill-detection are omitted here.
        // This underestimates value in clusters and will NOT suppress firing near a
        // low-HP ally. Accepted as a conservative start; revisit if bots team-kill.
        const value = scoreCandidate({
          enemyDamage,
          friendlyDamage: 0,
          killsAlly: false,
          targetHp: target.hp,
          spellCost: getSpellCost(Lightning.spell),
          currentMana,
        });
        if (value === null) return null;
        return { target: Cluster.onCharacter(target), value, to: [myNode] };
      })
      .filter(Boolean)
      .sort((a, b) => b!.value - a!.value) as Evaluation[];

    this.getNextEvaluation();
  }
}
