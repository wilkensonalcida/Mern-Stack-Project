'use strict';

const { randomInt } = require('node:crypto');

const UPGRADE_ITEMS = Object.freeze([
  Object.freeze({ id: 'sharpened_blade', name: 'Sharpened Blade', stat: 'attack', bonus: 0.25, description: '+25% attack per click' }),
  Object.freeze({ id: 'heated_blade', name: 'Heated Blade', stat: 'attack', bonus: 0.25, description: '+25% attack per click' }),
  Object.freeze({ id: 'wood_shield', name: 'Wooden Shield', stat: 'block', bonus: 0.25, description: '+25% blocked damage per click' }),
  Object.freeze({ id: 'metal_shield', name: 'Metal Shield', stat: 'block', bonus: 0.25, description: '+25% blocked damage per click' }),
  Object.freeze({ id: 'healing_potion', name: 'Healing Potion', stat: 'heal', bonus: 0.25, description: '+25% healing per click' }),
  Object.freeze({ id: 'gauze', name: 'Gauze', stat: 'heal', bonus: 0.25, description: '+25% healing per click' }),
]);
const ITEMS_BY_ID = new Map(UPGRADE_ITEMS.map(item => [item.id, item]));
const TEAMS = ['red', 'blue'];

function rollUpgradeOptions(count = 3) {
  if (!Number.isInteger(count) || count < 1 || count > UPGRADE_ITEMS.length) {
    throw new RangeError('Invalid upgrade option count');
  }
  const shuffled = [...UPGRADE_ITEMS];
  for (let i = 0; i < count; i++) {
    const j = randomInt(i, shuffled.length);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, count).map(item => ({ ...item }));
}

function preparePlayerSelection(player, stage) {
  player.selectedUpgrade = null;
  player.selectionStage = stage;
  player.upgradeOptions = player.hp > 0 ? rollUpgradeOptions(3) : [];
}

function clearPlayerSelection(player) {
  player.selectedUpgrade = null;
  player.selectionStage = null;
  player.upgradeOptions = [];
}

function isChosenForStage(player, stage) {
  if (player.hp <= 0) return true; // Dead players are exempt, not counted as choices.
  if (player.selectionStage !== stage) return false;
  const id = player.selectedUpgrade;
  return typeof id === 'string' && ITEMS_BY_ID.has(id) &&
    Array.isArray(player.upgradeOptions) &&
    player.upgradeOptions.some(item => item.id === id);
}

function allLivingPlayersSelected(lobby, game) {
  return TEAMS.every(team => {
    const fight = game.teams[team];
    if (fight.phase !== 'selection') return false;
    const living = lobby.players.filter(p => p.team === team && p.hp > 0);
    return living.length > 0 && living.every(p => isChosenForStage(p, fight.stage));
  });
}

function choosePlayerUpgrade(player, stage, itemId) {
  if (player.hp <= 0) return { success: false, error: 'Defeated players cannot choose.' };
  if (player.selectionStage !== stage) return { success: false, error: 'Outdated selection stage.' };
  if (player.selectedUpgrade != null) return { success: false, error: 'Already selected an item.' };
  if (typeof itemId !== 'string' || !Array.isArray(player.upgradeOptions) ||
      !player.upgradeOptions.some(item => item.id === itemId)) {
    return { success: false, error: 'Item was not offered to this player.' };
  }
  const item = ITEMS_BY_ID.get(itemId);
  if (!item) return { success: false, error: 'Unknown upgrade.' };
  if (!player.buffs || !Number.isFinite(player.buffs[item.stat])) {
    return { success: false, error: 'Player buffs are not initialized.' };
  }
  player.buffs[item.stat] = Math.round((player.buffs[item.stat] + item.bonus) * 100) / 100;
  player.selectedUpgrade = item.id;
  return { success: true, selectedUpgrade: item.id, stat: item.stat, multiplier: player.buffs[item.stat] };
}

module.exports = {
  UPGRADE_ITEMS,
  rollUpgradeOptions,
  preparePlayerSelection,
  clearPlayerSelection,
  isChosenForStage,
  allLivingPlayersSelected,
  choosePlayerUpgrade,
};
