'use strict';

// Pure PvP calculations. The server owns these values; clients never send damage or buffs.
const BASE = Object.freeze({ attack: 2, block: 0.5, heal: 0.5 });
const TEAMS = Object.freeze(['red', 'blue']);
const MOVES = Object.freeze(['attack', 'block', 'heal']);
const round1 = value => Math.round((value + Number.EPSILON) * 10) / 10;
const otherTeam = team => team === 'red' ? 'blue' : 'red';
const alive = (players, team) => players.filter(p => p.team === team && p.hp > 0);
const emptyTaps = () => ({ attack: 0, block: 0, heal: 0 });

function createPlayers(pvpData) {
  if (!pvpData || !Array.isArray(pvpData.players)) throw new Error('Missing PvP handoff.');
  const seen = new Set();
  const players = pvpData.players.map(player => {
    if (!player || !player.id || !TEAMS.includes(player.team) || seen.has(player.id)) {
      throw new Error('Invalid or duplicated PvP player.');
    }
    seen.add(player.id);
    const maxHp = Number(player.maxHp);
    const hp = Number(player.hp);
    if (!Number.isFinite(maxHp) || maxHp <= 0 || !Number.isFinite(hp)) {
      throw new Error('Invalid PvP health.');
    }
    const buffs = {};
    for (const move of MOVES) {
      const value = Number(player.buffs?.[move]);
      if (!Number.isFinite(value) || value <= 0 || value > 100) throw new Error('Invalid player buff.');
      buffs[move] = value;
    }
    return {
      id: String(player.id), name: String(player.name ?? '').slice(0, 40),
      team: player.team, hp: round1(Math.min(maxHp, Math.max(0, hp))),
      maxHp, shield: 0, buffs,
    };
  });
  if (!TEAMS.every(team => alive(players, team).length)) {
    throw new Error('Both teams require a living fighter.');
  }
  return players;
}

function resolveTurn(players, activeTeam, tapsById = new Map()) {
  if (!TEAMS.includes(activeTeam)) throw new Error('Invalid attacking team.');
  const roster = players.map(p => ({ ...p, buffs: { ...p.buffs } }));
  const attackers = alive(roster, activeTeam);
  const defenders = alive(roster, otherTeam(activeTeam));
  if (!attackers.length || !defenders.length) throw new Error('Cannot resolve a turn with a wiped team.');

  let totalAttack = 0;
  let totalHealed = 0;
  let shieldsGranted = 0;
  for (const player of attackers) {
    const taps = tapsById.get(player.id) || emptyTaps();
    totalAttack += Math.max(0, taps.attack || 0) * BASE.attack * player.buffs.attack;
    const heal = Math.max(0, taps.heal || 0) * BASE.heal * player.buffs.heal;
    const oldHp = player.hp;
    player.hp = round1(Math.min(player.maxHp, player.hp + heal));
    totalHealed += player.hp - oldHp;
    player.shield = round1(Math.max(0, taps.block || 0) * BASE.block * player.buffs.block);
    shieldsGranted += player.shield;
  }

  const damagePerTarget = totalAttack / attackers.length;
  let effectiveDamage = 0;
  let blocked = 0;
  const casualties = [];
  for (const target of defenders) {
    const absorbed = Math.min(target.shield, damagePerTarget);
    const before = target.hp;
    target.hp = round1(Math.max(0, before - Math.max(0, damagePerTarget - absorbed)));
    target.shield = 0; 
    effectiveDamage += before - target.hp;
    blocked += absorbed;
    if (target.hp === 0) casualties.push(target.id);
  }
  const result = {
    team: activeTeam,
    attackers: attackers.length,
    defenders: defenders.length,
    totalAttack: round1(totalAttack),
    damagePerTarget: round1(damagePerTarget),
    effectiveDamage: round1(effectiveDamage),
    blocked: round1(blocked),
    healed: round1(totalHealed),
    shield: round1(shieldsGranted),
    casualties,
  };
  const winner = alive(roster, otherTeam(activeTeam)).length === 0 ? activeTeam : null;
  return { players: roster, result, winner };
}

module.exports = { BASE, TEAMS, MOVES, round1, otherTeam, alive, emptyTaps, createPlayers, resolveTurn };
