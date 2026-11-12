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
  player.upgradeOptions = rollUpgradeOptions(3);
}

function clearPlayerSelection(player) {
  player.selectedUpgrade = null;
  player.selectionStage = null;
  player.upgradeOptions = [];
}

function isChosenForStage(player, stage) {
  if (player.selectionStage !== stage) return false;
  const id = player.selectedUpgrade;
  return typeof id === 'string' && ITEMS_BY_ID.has(id) &&
    Array.isArray(player.upgradeOptions) &&
    player.upgradeOptions.some(item => item.id === id);
}

// Players share their team's knight, so nobody on a team sits a pick out.
function allPlayersSelected(lobby, game) {
  return TEAMS.every(team => {
    const fight = game.teams[team];
    if (fight.phase !== 'selection') return false;
    const teamPlayers = lobby.players.filter(p => p.team === team);
    return teamPlayers.length > 0 && teamPlayers.every(p => isChosenForStage(p, fight.stage));
  });
}

// Each pick adds its bonus to the team knight that the player fights with.
function choosePlayerUpgrade(player, knight, stage, itemId) {
  if (player.selectionStage !== stage) return { success: false, error: 'Outdated selection stage.' };
  if (player.selectedUpgrade != null) return { success: false, error: 'Already selected an item.' };
  if (typeof itemId !== 'string' || !Array.isArray(player.upgradeOptions) ||
      !player.upgradeOptions.some(item => item.id === itemId)) {
    return { success: false, error: 'Item was not offered to this player.' };
  }
  const item = ITEMS_BY_ID.get(itemId);
  if (!item) return { success: false, error: 'Unknown upgrade.' };
  if (!knight?.buffs || !Number.isFinite(knight.buffs[item.stat])) {
    return { success: false, error: 'Knight buffs are not initialized.' };
  }
  knight.buffs[item.stat] = Math.round((knight.buffs[item.stat] + item.bonus) * 100) / 100;
  player.selectedUpgrade = item.id;
  return { success: true, selectedUpgrade: item.id, stat: item.stat, multiplier: knight.buffs[item.stat] };
}

module.exports = {
  UPGRADE_ITEMS,
  rollUpgradeOptions,
  preparePlayerSelection,
  clearPlayerSelection,
  isChosenForStage,
  allPlayersSelected,
  choosePlayerUpgrade,
};
