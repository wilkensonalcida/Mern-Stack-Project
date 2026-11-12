'use strict';

// Pure boss fight math. Each team fights with one knight. When a round ends,
// the team's taps are added up, divided by its player count, and applied once,
// so a bigger team taps no harder than a smaller one.
const BASE = Object.freeze({ attack: 2, block: 1, heal: 1 });
const MOVES = Object.freeze(['attack', 'block', 'heal']);
const KNIGHT_HP = 100;
const round1 = value => Math.round((value + Number.EPSILON) * 10) / 10;

function createKnight() {
  return { hp: KNIGHT_HP, maxHp: KNIGHT_HP, buffs: { attack: 1, block: 1, heal: 1 } };
}

// Adds up each move across the team's tap counts, ignoring anything that isn't a count.
function sumTaps(tapCounts) {
  const total = { attack: 0, block: 0, heal: 0 };
  for (const taps of tapCounts) {
    for (const move of MOVES) {
      const count = Number(taps?.[move]);
      if (Number.isFinite(count) && count > 0) total[move] += count;
    }
  }
  return total;
}

// One round's end: attacks come off the enemy, blocks come off the enemy's
// hit, up to the whole hit, and heals go onto the knight, up to its max HP.
function resolveEnemyRound({ knight, enemyHp, enemyDamage, tapCounts, playerCount }) {
  const players = Math.max(1, playerCount);
  const taps = sumTaps(tapCounts);
  const attack = taps.attack / players * BASE.attack * knight.buffs.attack;
  const blocked = Math.min(enemyDamage, taps.block / players * BASE.block * knight.buffs.block);
  const healed = taps.heal / players * BASE.heal * knight.buffs.heal;
  const hp = round1(Math.min(knight.maxHp, Math.max(0, knight.hp - (enemyDamage - blocked) + healed)));
  return {
    knight: { ...knight, hp, buffs: { ...knight.buffs } },
    enemyHp: round1(Math.max(0, enemyHp - attack)),
    attack: round1(attack),
    blocked: round1(blocked),
    healed: round1(healed),
  };
}

module.exports = { BASE, MOVES, KNIGHT_HP, round1, createKnight, sumTaps, resolveEnemyRound };
