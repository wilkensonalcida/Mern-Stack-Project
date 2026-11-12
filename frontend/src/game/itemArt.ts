import type { Move, Upgrade } from './enemyTypes';
// Alex's item drawings. The plain sword, the eagle shield and the potion stand for the moves,
// and each item in the vote shows its own drawing.
import sharpenedBlade from '../../sprites/items/sword1.png';
import heatedBlade from '../../sprites/items/sword2.png';
import metalShield from '../../sprites/items/shield1.png';
import woodShield from '../../sprites/items/shield2.png';
import gauze from '../../sprites/items/heal1.png';
import healingPotion from '../../sprites/items/heal2.png';

export const moveIcons: Record<Move, string> = { attack: sharpenedBlade, block: metalShield, heal: healingPotion };

export const itemIcons: Record<Upgrade, string> = {
  sharpened_blade: sharpenedBlade,
  heated_blade: heatedBlade,
  metal_shield: metalShield,
  wood_shield: woodShield,
  healing_potion: healingPotion,
  gauze,
};
