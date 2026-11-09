// Server-owned PvE engine. Attach to the existing lobby manager using the integration steps in README.
const ENEMIES = [
  { name: 'Goblin', hp: 100, damage: 10 },
  { name: 'Skeleton', hp: 150, damage: 15 },
];
const ROUND_MS = 5000;
const PAUSE_MS = 1500;
const BASE = { attack: 2, block: 0.5, heal: 0.5 };
const BONUS = 0.25; // Each chosen item adds 25% of the base value.
const MAX_TAPS_PER_MOVE = 250;
const TEAMS = ['red', 'blue'];
const round1 = n => Math.round(n * 10) / 10;

function createEnemyGameManager(io, lobbies) {
  const games = new Map();
  const timers = new Map();
  const key = (code, team) => `${code}:${team}`;
  const members = (lobby, team) => lobby.players.filter(p => p.team === team);
  const reply = (cb, payload) => { if (typeof cb === 'function') cb(payload); };

  function clearTimers(code) {
    for (const team of TEAMS) {
      const k = key(code, team);
      clearTimeout(timers.get(k));
      timers.delete(k);
    }
  }
  function stop(code) {
    clearTimers(code);
    games.delete(code);
  }
  function publicPlayer(p) {
    return { id: p.id, name: p.name, team: p.team, hp: p.hp, maxHp: p.maxHp, buffs: { ...p.buffs }, selected: p.selected };
  }
  function snapshot(lobby, game, team) {
    const f = game.teams[team];
    const spec = ENEMIES[f.stage];
    return {
      code: lobby.code, team, phase: f.phase, stage: f.stage,
      enemy: spec ? { name: spec.name, hp: f.enemyHp, maxHp: spec.hp, damage: spec.damage } : null,
      round: f.round, endsAt: f.endsAt,
      players: members(lobby, team).map(publicPlayer),
      lastRound: f.lastRound,
    };
  }
  function broadcast(lobby, game, team) {
    const state = snapshot(lobby, game, team);
    // Separate perspectives: send only this team's NPC HP, players, and upgrades.
    for (const p of members(lobby, team)) io.to(p.id).emit('game:enemy:state', state);
  }
  function startRound(lobby, game, team) {
    const f = game.teams[team];
    if (f.phase === 'failed' || f.phase === 'ready') return;
    f.phase = 'combat';
    f.round += 1;
    f.endsAt = Date.now() + ROUND_MS;
    f.taps = new Map();
    broadcast(lobby, game, team);
    const k = key(lobby.code, team);
    clearTimeout(timers.get(k));
    timers.set(k, setTimeout(() => finishRound(lobby.code, team), ROUND_MS));
  }
  function allSelectionsFinished(lobby, game, team) {
    const f = game.teams[team];
    if (f.phase !== 'selection') return;
    const alive = members(lobby, team).filter(p => p.hp > 0);
    if (!alive.every(p => p.selected)) return;
    f.stage += 1;
    f.round = 0;
    f.lastRound = null;
    f.taps = new Map();
    if (f.stage >= ENEMIES.length) {
      f.phase = 'ready';
      f.endsAt = null;
      broadcast(lobby, game, team);
      maybeStartPvp(lobby, game);
      return;
    }
    f.enemyHp = ENEMIES[f.stage].hp;
    startRound(lobby, game, team);
  }
  function maybeStartPvp(lobby, game) {
    if (game.pvpSent || !TEAMS.every(t => game.teams[t].phase === 'ready')) return;
    game.pvpSent = true;
    const players = lobby.players.filter(p => p.team === 'red' || p.team === 'blue').map(p => ({
      id: p.id, name: p.name, team: p.team, hp: p.hp, maxHp: p.maxHp, buffs: { ...p.buffs },
    }));
    const payload = { code: lobby.code, players };
    // Stores the hand-off so a late client can retrieve it via game:pvp:get.
    game.pvp = payload;
    io.to(lobby.code).emit('game:pvp-ready', payload);
  }
  function finishRound(code, team) {
    const lobby = lobbies.get(code);
    const game = games.get(code);
    if (!lobby || !game) return;
    const f = game.teams[team];
    if (f.phase !== 'combat') return;
    f.endsAt = null;
    const spec = ENEMIES[f.stage];
    const alive = members(lobby, team).filter(p => p.hp > 0);
    let attack = 0;
    const playerEffects = [];
    for (const p of alive) {
      const taps = f.taps.get(p.id) || { attack: 0, block: 0, heal: 0 };
      attack += taps.attack * BASE.attack * p.buffs.attack;
      const blocked = Math.min(spec.damage, taps.block * BASE.block * p.buffs.block);
      const healed = taps.heal * BASE.heal * p.buffs.heal;
      // Each teammate takes their own NPC damage, adjusted by their own block and heal.
      p.hp = round1(Math.min(p.maxHp, Math.max(0, p.hp - (spec.damage - blocked) + healed)));
      playerEffects.push({ id: p.id, blocked: round1(blocked), healed: round1(healed), hp: p.hp });
    }
    f.enemyHp = round1(Math.max(0, f.enemyHp - attack));
    f.lastRound = { round: f.round, attack: round1(attack), enemyDamage: spec.damage, enemyHp: f.enemyHp, playerEffects };
    broadcast(lobby, game, team);

    const k = key(code, team);
    clearTimeout(timers.get(k));
    if (f.enemyHp <= 0) {
      f.phase = 'selection';
      for (const p of members(lobby, team)) p.selected = false;
      broadcast(lobby, game, team);
      return;
    }
    if (!members(lobby, team).some(p => p.hp > 0)) {
      f.phase = 'failed';
      broadcast(lobby, game, team);
      io.to(code).emit('game:enemy:failed', { team });
      return;
    }
    timers.set(k, setTimeout(() => startRound(lobby, game, team), PAUSE_MS));
  }
  function begin(lobby) {
    if (games.has(lobby.code)) return;
    const roster = lobby.players.filter(p => TEAMS.includes(p.team));
    if (!TEAMS.every(team => roster.some(p => p.team === team))) throw new Error('Both teams need a player.');
    if (roster.length !== lobby.players.length) throw new Error('Everyone must pick a team.');
    for (const p of roster) {
      p.hp = 100; p.maxHp = 100;
      p.buffs = { attack: 1, block: 1, heal: 1 };
      p.selected = false;
    }
    const makeTeam = () => ({ phase: 'combat', stage: 0, round: 0, enemyHp: ENEMIES[0].hp, endsAt: null, taps: new Map(), lastRound: null });
    const game = { teams: { red: makeTeam(), blue: makeTeam() }, pvpSent: false, pvp: null };
    games.set(lobby.code, game);
    for (const team of TEAMS) startRound(lobby, game, team);
  }
  function register(socket) {
    function context(cb) {
      const code = socket.data.lobbyCode;
      const lobby = lobbies.get(code);
      const game = games.get(code);
      const player = lobby?.players.find(p => p.id === socket.id);
      if (!lobby || !game || !player || !TEAMS.includes(player.team)) {
        reply(cb, { success: false, error: 'Not an active team member.' });
        return null;
      }
      return { lobby, game, player, f: game.teams[player.team] };
    }
    socket.on('game:enemy:get', (code, cb) => {
      const c = context(cb);
      if (!c) return;
      if (String(code).toUpperCase() !== c.lobby.code) return reply(cb, { success: false, error: 'Wrong session code.' });
      reply(cb, { success: true, state: snapshot(c.lobby, c.game, c.player.team) });
    });
    socket.on('game:enemy:tap', (move, cb) => {
      const c = context(cb);
      if (!c) return;
      if (c.f.phase !== 'combat' || !c.f.endsAt || Date.now() >= c.f.endsAt || c.player.hp <= 0 || !Object.hasOwn(BASE, move)) {
        return reply(cb, { success: false, error: 'Not accepting taps.' });
      }
      const taps = c.f.taps.get(socket.id) || { attack: 0, block: 0, heal: 0 };
      if (taps[move] >= MAX_TAPS_PER_MOVE) return reply(cb, { success: false, error: 'Tap limit reached.' });
      taps[move]++;
      c.f.taps.set(socket.id, taps);
      reply(cb, { success: true });
    });
    socket.on('game:enemy:choose', (upgrade, cb) => {
      const c = context(cb);
      if (!c) return;
      if (c.f.phase !== 'selection' || c.player.hp <= 0 || c.player.selected || !Object.hasOwn(BASE, upgrade)) {
        return reply(cb, { success: false, error: 'Invalid or duplicate selection.' });
      }
      c.player.buffs[upgrade] = round1(c.player.buffs[upgrade] + BONUS);
      c.player.selected = true;
      reply(cb, { success: true });
      broadcast(c.lobby, c.game, c.player.team);
      allSelectionsFinished(c.lobby, c.game, c.player.team);
    });
    socket.on('game:pvp:get', (code, cb) => {
      const c = context(cb);
      if (!c) return;
      if (String(code).toUpperCase() !== c.lobby.code || !c.game.pvp) return reply(cb, { success: false, error: 'PvP not ready.' });
      reply(cb, { success: true, data: c.game.pvp });
    });
  }
  return { begin, register, stop };
}
module.exports = { createEnemyGameManager };
