'use strict';

// Pure PvP rules, with no timers or sockets. Each team fights with one knight,
// carried over from the boss fights with its HP and item bonuses. Teams take
// turns. When a turn ends, its team's taps are divided by the team's player
// count and multiplied by its knight's bonuses: attacks hit the other knight
// through that knight's shield, heals go onto the team's own knight, and
// blocks become its shield for the other team's next turn.
const { sumTaps } = require('./enemyRules');

const BASE = Object.freeze({ attack: 2, block: 0.5, heal: 0.5 });
const TEAMS = Object.freeze(['red', 'blue']);
const MOVES = Object.freeze(['attack', 'block', 'heal']);
const round1 = value => Math.round((value + Number.EPSILON) * 10) / 10;
const otherTeam = team => team === 'red' ? 'blue' : 'red';
const emptyTaps = () => ({ attack: 0, block: 0, heal: 0 });

// Picks the team that taps first.
function flipCoin(random = Math.random) {
  return random() < 0.5 ? 'red' : 'blue';
}

// Builds both knights from the boss fights' handoff, checking each value, since PvP trusts nothing a client sent.
function createKnights(pvpData) {
  if (!pvpData || !pvpData.knights) throw new Error('Missing PvP handoff.');
  const knights = {};
  for (const team of TEAMS) {
    const knight = pvpData.knights[team];
    const maxHp = Number(knight?.maxHp);
    const hp = Number(knight?.hp);
    if (!Number.isFinite(maxHp) || maxHp <= 0 || !Number.isFinite(hp) || hp <= 0) {
      throw new Error('Invalid PvP health.');
    }
    const buffs = {};
    for (const move of MOVES) {
      const value = Number(knight.buffs?.[move]);
      if (!Number.isFinite(value) || value <= 0 || value > 100) throw new Error('Invalid knight buff.');
      buffs[move] = value;
    }
    knights[team] = { hp: round1(Math.min(maxHp, hp)), maxHp, shield: 0, buffs };
  }
  return knights;
}

// Ends the active team's turn. Only the taps of that team's current players
// count, and they're divided by its player count, at least 1, so a bigger team
// doesn't win on numbers alone. A shield soaks up the other team's next
// attack, then resets, used or not.
function resolveTurn(knights, activeTeam, tapsById, teamPlayerIds) {
  if (!TEAMS.includes(activeTeam)) throw new Error('Invalid attacking team.');
  const foeTeam = otherTeam(activeTeam);
  const own = knights[activeTeam];
  const foe = knights[foeTeam];
  const players = Math.max(1, teamPlayerIds.length);
  const taps = sumTaps(teamPlayerIds.map(id => tapsById.get(id)));

  const attack = taps.attack / players * BASE.attack * own.buffs.attack;
  const blocked = Math.min(foe.shield, attack);
  const foeHp = round1(Math.max(0, foe.hp - (attack - blocked)));
  const ownHp = round1(Math.min(own.maxHp, own.hp + taps.heal / players * BASE.heal * own.buffs.heal));
  const shield = round1(taps.block / players * BASE.block * own.buffs.block);

  return {
    knights: {
      [activeTeam]: { ...own, buffs: { ...own.buffs }, hp: ownHp, shield },
      [foeTeam]: { ...foe, buffs: { ...foe.buffs }, hp: foeHp, shield: 0 },
    },
    result: {
      team: activeTeam,
      damage: round1(foe.hp - foeHp),
      blocked: round1(blocked),
      healed: round1(ownHp - own.hp),
      shield,
      taps,
    },
    winner: foeHp === 0 ? activeTeam : null,
  };
}

module.exports = { BASE, TEAMS, MOVES, round1, otherTeam, emptyTaps, flipCoin, createKnights, resolveTurn };
