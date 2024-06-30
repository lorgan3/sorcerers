import { Force } from "../damage/targetList";
import { DamageSource } from "../damage/types";
import { Character } from "../entity/character";
import { MagicScroll } from "../entity/magicScroll";
import { Potion } from "../entity/potion";
import { Item } from "../entity/types";
import { Spell } from "../spells";
import { Element } from "../spells/types";
import { Manager } from "./manager";
import { Player } from "./player";

export class Stats {
  public selfDamage = 0;
  public overkillDamage = 0;
  public damageDealt = 0;
  public knockbackDealt = 0;

  public damageTaken = 0;
  public knockbackTaken = 0;

  public kills: Character[] = [];
  public deaths = 0;
  public timeOfDeath = 60 * 60 * 1000;

  public elementUsage = Object.fromEntries(
    Object.values(Element).map((element) => [element, 0])
  ) as Record<Element, number>;

  public elementEfficiency = Object.fromEntries(
    Object.values(Element).map((element) => [element, 0])
  ) as Record<Element, number>;

  public potionsUsed = 0;
  public scrollsUsed = 0;

  constructor(public readonly self: Player) {}

  registerCast(spell: Spell) {
    for (let element of spell.elements) {
      this.elementUsage[element]++;
      this.elementEfficiency[element] +=
        Manager.instance.getElementValue(element);
    }
  }

  registerDamage(
    damageSource: DamageSource,
    character: Character,
    damage: number,
    force?: Force
  ) {
    const actualDamage = Math.min(Math.max(character.hp, 0), damage);

    this.damageTaken += actualDamage;
    this.knockbackTaken += force?.power || 0;

    if (character.hp > 0 && damage > character.hp) {
      this.deaths++;

      if (
        this.self.characters.every(
          (otherCharacter) =>
            otherCharacter.hp <= 0 || character === otherCharacter
        )
      ) {
        this.timeOfDeath = Manager.instance.getTime();
      }

      if (damageSource.cause) {
        damageSource.cause.stats.kills.push(character);
      }
    }

    if (damageSource.cause) {
      damageSource.cause.stats.damageDealt += actualDamage;
      damageSource.cause.stats.knockbackDealt += force?.power || 0;
      damageSource.cause.stats.overkillDamage += damage - actualDamage;
    }

    if (damageSource.cause === this.self) {
      this.selfDamage += actualDamage;
    }
  }

  registerItem(item: Item) {
    if (item instanceof Potion) {
      this.potionsUsed++;
    }

    if (item instanceof MagicScroll) {
      this.scrollsUsed++;
    }
  }
}
