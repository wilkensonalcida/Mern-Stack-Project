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

const STATS = ['attack', 'block', 'heal'];

// Each vote offers a team one item for each move, in the controller's order, so no two of its offers do
// the same thing. Each move has two items, and they go one to each team, so the teams never get the same item.
function rollTeamOffers(pickIndex = randomInt) {
  const offers = { red: [], blue: [] };
  for (const stat of STATS) {
    const items = UPGRADE_ITEMS.filter(item => item.stat === stat);
    if (items.length !== 2) throw new Error(`Each move needs two items, and ${stat} has ${items.length}.`);
    const toRed = pickIndex(2);
    offers.red.push({ ...items[toRed] });
    offers.blue.push({ ...items[1 - toRed] });
  }
  return offers;
}

// After each boss, a team votes on one item for its knight from its three offers.
// Each player votes for one and can switch until the vote closes, which happens
// once every player on the team has voted, or when its time runs out.
function openVote(stage, endsAt, offers) {
  return { stage, offers, votes: new Map(), endsAt, closed: false, pick: null };
}

function castVote(vote, playerId, itemId) {
  if (!vote || vote.closed) return { success: false, error: 'The vote is closed.' };
  if (typeof itemId !== 'string' || !vote.offers.some(item => item.id === itemId)) {
    return { success: false, error: 'That item is not on offer.' };
  }
  vote.votes.set(playerId, itemId);
  return { success: true, itemId };
}

// Counts only the votes of players still on the team.
function voteCounts(vote, playerIds) {
  const counts = Object.fromEntries(vote.offers.map(item => [item.id, 0]));
  for (const id of playerIds) {
    const itemId = vote.votes.get(id);
    if (itemId !== undefined && itemId in counts) counts[itemId]++;
  }
  return counts;
}

function everyoneVoted(vote, playerIds) {
  return playerIds.every(id => vote.votes.has(id));
}

// The most votes win. A tie, zero votes included, goes to one of the tied items at random.
function decideVote(vote, playerIds, pickIndex = randomInt) {
  const counts = voteCounts(vote, playerIds);
  const most = Math.max(...Object.values(counts));
  const tied = vote.offers.filter(item => counts[item.id] === most);
  return tied.length === 1 ? tied[0].id : tied[pickIndex(tied.length)].id;
}

// Adds the picked item's bonus to the team knight's multiplier for its move.
function applyPick(knight, itemId) {
  const item = ITEMS_BY_ID.get(itemId);
  if (!item) throw new Error('Unknown upgrade.');
  if (!knight?.buffs || !Number.isFinite(knight.buffs[item.stat])) throw new Error('Knight buffs are not initialized.');
  knight.buffs[item.stat] = Math.round((knight.buffs[item.stat] + item.bonus) * 100) / 100;
  return item;
}

module.exports = {
  UPGRADE_ITEMS,
  rollTeamOffers,
  openVote,
  castVote,
  voteCounts,
  everyoneVoted,
  decideVote,
  applyPick,
};
