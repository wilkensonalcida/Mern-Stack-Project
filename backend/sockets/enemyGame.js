const ENEMIES = [
  { name: 'Goblin', hp: 100, damage: 10 },
  { name: 'Skeleton', hp: 150, damage: 15 },
];
const MAX_TAPS_PER_MOVE = 250;
const TEAMS = ['red', 'blue'];
const otherTeam = team => team === 'red' ? 'blue' : 'red';
const { BASE, createKnight, resolveEnemyRound, sumTaps } = require('./enemyRules');
const {
  preparePlayerSelection,
  clearPlayerSelection,
  choosePlayerUpgrade,
  allPlayersSelected,
} = require('./upgradeSelection');

function createEnemyGameManager(io, lobbies, options = {}) {
  const ROUND_MS = options.roundMs ?? 5000;
  const PAUSE_MS = options.pauseMs ?? 1500;
  const START_DELAY_MS = options.startDelayMs ?? 3000;
  const HOST_TAPS_MS = options.hostTapsMs ?? 200;

  const games = new Map();
  const timers = new Map();
  const hostTimers = new Map();
  const key = (code, team) => `${code}:${team}`;
  const members = (lobby, team) => lobby.players.filter(p => p.team === team);
  const reply = (cb, payload) => {
    if (typeof cb === 'function') cb(payload);
  };

  function clearTimers(code) {
    for (const team of TEAMS) {
      const k = key(code, team);
      clearTimeout(timers.get(k));
      timers.delete(k);
    }
  }

  function stop(code) {
    clearTimers(code);
    clearTimeout(hostTimers.get(code));
    hostTimers.delete(code);
    games.delete(code);
  }

  // Each client sees its own item offers only; teammates see completion status.
  function publicPlayer(player, viewerId) {
    return {
      id: player.id,
      name: player.name,
      team: player.team,
      selectedUpgrade: player.selectedUpgrade ?? null,
      selectionStage: player.selectionStage ?? null,
      upgradeOptions: player.id === viewerId
        ? (player.upgradeOptions ?? []).map(item => ({ ...item }))
        : [],
    };
  }

  // One team's fight, as its phones and the host's screen both see it.
  function fightView(game, team) {
    const fight = game.teams[team];
    const spec = ENEMIES[fight.stage];
    return {
      team,
      phase: fight.phase,
      stage: fight.stage,
      enemy: spec ? {
        name: spec.name,
        hp: fight.enemyHp,
        maxHp: spec.hp,
        damage: spec.damage,
      } : null,
      round: fight.round,
      endsAt: fight.endsAt,
      remainingMs: fight.endsAt === null ? 0 : Math.max(0, fight.endsAt - Date.now()),
      knight: { hp: fight.knight.hp, maxHp: fight.knight.maxHp, buffs: { ...fight.knight.buffs } },
      lastRound: fight.lastRound,
    };
  }

  function snapshot(lobby, game, team, viewerId) {
    return {
      code: lobby.code,
      ...fightView(game, team),
      players: members(lobby, team).map(player => publicPlayer(player, viewerId)),
    };
  }

  // The host's screen shows both fights side by side, with each team's taps
  // so far this round, and no player's private item offers.
  function hostSnapshot(lobby, game) {
    const teams = {};
    for (const team of TEAMS) {
      const teamPlayers = members(lobby, team);
      teams[team] = {
        ...fightView(game, team),
        players: teamPlayers.map(player => ({
          id: player.id,
          name: player.name,
          picked: player.selectedUpgrade != null,
        })),
        taps: sumTaps(teamPlayers.map(player => game.teams[team].taps.get(player.id))),
      };
    }
    return { code: lobby.code, pvpStarted: game.pvpSent, teams };
  }

  function sendHost(lobby, game) {
    io.to(lobby.hostId).emit('game:enemy:host', hostSnapshot(lobby, game));
  }

  function emitTeam(lobby, game, team) {
    for (const player of members(lobby, team)) {
      io.to(player.id).emit('game:enemy:state',
        snapshot(lobby, game, team, player.id));
    }
  }

  function broadcast(lobby, game, team) {
    emitTeam(lobby, game, team);
    sendHost(lobby, game);
  }

  function broadcastBoth(lobby, game) {
    for (const team of TEAMS) emitTeam(lobby, game, team);
    sendHost(lobby, game);
  }

  // Taps reach the host's screen at most five times a second.
  function scheduleHostTaps(lobby, game) {
    if (hostTimers.has(lobby.code)) return;
    hostTimers.set(lobby.code, setTimeout(() => {
      hostTimers.delete(lobby.code);
      if (games.get(lobby.code) === game) sendHost(lobby, game);
    }, HOST_TAPS_MS));
  }

  function scheduleRound(lobby, game, team, delay) {
    const k = key(lobby.code, team);
    clearTimeout(timers.get(k));
    timers.set(k, setTimeout(() => {
      if (games.get(lobby.code) !== game || game.finished || game.pvpSent) return;
      startRound(lobby, game, team);
    }, delay));
  }

  function startRound(lobby, game, team) {
    const fight = game.teams[team];
    if (games.get(lobby.code) !== game || game.finished || game.pvpSent) return;
    if (fight.phase !== 'combat' || fight.endsAt !== null) return;

    fight.round++;
    fight.endsAt = Date.now() + ROUND_MS;
    fight.taps = new Map();
    broadcast(lobby, game, team);

    const k = key(lobby.code, team);
    clearTimeout(timers.get(k));
    timers.set(k, setTimeout(() => finishRound(lobby.code, team), ROUND_MS));
  }

  function finishGame(lobby, game, winner, reason) {
    if (game.finished || game.pvpSent) return;
    clearTimers(lobby.code);
    game.finished = {
      code: lobby.code,
      winner,
      loser: otherTeam(winner),
      reason,
    };
    for (const team of TEAMS) {
      game.teams[team].endsAt = null;
      game.teams[team].phase = team === winner ? 'won' : 'failed';
    }
    broadcastBoth(lobby, game);
    io.to(lobby.code).emit('game:finished', game.finished);
  }
  // The waiting room.
  function maybeBeginSelection(lobby, game) {
    if (game.finished || game.pvpSent) return;
    if (!TEAMS.every(team => game.teams[team].phase === 'waiting')) return;
    for (const team of TEAMS) {
      const fight = game.teams[team];
      fight.phase = 'selection';
      fight.endsAt = null;
      for (const player of members(lobby, team)) preparePlayerSelection(player, fight.stage);
    }
    broadcastBoth(lobby, game);
  }

  function maybeAdvanceAfterSelections(lobby, game) {
    if (game.finished || game.pvpSent) return;
    if (!allPlayersSelected(lobby, game)) return;

    const finalStage = TEAMS.every(team => game.teams[team].stage === ENEMIES.length - 1);
    if (finalStage) {
      // PvP still takes one fighter per player, so each player brings a copy
      // of the team knight's HP and item bonuses until PvP has team knights too.
      const players = lobby.players
        .filter(player => TEAMS.includes(player.team))
        .map(player => {
          const knight = game.teams[player.team].knight;
          return {
            id: player.id,
            name: player.name,
            team: player.team,
            hp: knight.hp,
            maxHp: knight.maxHp,
            buffs: { ...knight.buffs },
          };
        });
      // Initialize server-authoritative PvP BEFORE broadcasting the handoff.
      // If initialization fails, do not leave browsers on an unplayable PvP page.
      const handoff = { code: lobby.code, players };
      if (typeof options.onPvpReady === 'function') {
        try {
          options.onPvpReady(lobby, handoff);
        } catch (error) {
          console.error('[PVP INITIALIZATION FAILED]', lobby.code, error);
          return;
        }
      }
      game.pvp = handoff;
      game.pvpSent = true;
      for (const team of TEAMS) {
        game.teams[team].phase = 'ready';
        game.teams[team].endsAt = null;
      }
      broadcastBoth(lobby, game);
      io.to(lobby.code).emit('game:pvp-ready', game.pvp);
      return;
    }

    for (const team of TEAMS) {
      const fight = game.teams[team];
      fight.stage++;
      fight.phase = 'combat';
      fight.round = 0;
      fight.enemyHp = ENEMIES[fight.stage].hp;
      fight.endsAt = null;
      fight.lastRound = null;
      fight.taps = new Map();
      for (const player of members(lobby, team)) clearPlayerSelection(player);
    }
    broadcastBoth(lobby, game);
    for (const team of TEAMS) scheduleRound(lobby, game, team, PAUSE_MS);
  }

  function finishRound(code, team) {
    const lobby = lobbies.get(code);
    const game = games.get(code);
    if (!lobby || !game || game.finished || game.pvpSent) return;
    const fight = game.teams[team];
    if (fight.phase !== 'combat' || fight.endsAt === null) return;

    fight.endsAt = null;
    const spec = ENEMIES[fight.stage];
    const teamMembers = members(lobby, team);
    const round = resolveEnemyRound({
      knight: fight.knight,
      enemyHp: fight.enemyHp,
      enemyDamage: spec.damage,
      tapCounts: teamMembers.map(player => fight.taps.get(player.id)),
      playerCount: teamMembers.length,
    });
    fight.knight = round.knight;
    fight.enemyHp = round.enemyHp;
    fight.lastRound = {
      round: fight.round,
      attack: round.attack,
      blocked: round.blocked,
      healed: round.healed,
      enemyDamage: spec.damage,
      enemyHp: fight.enemyHp,
      knightHp: fight.knight.hp,
    };

    // A team whose knight falls, or whose players have all left, loses.
    if (fight.knight.hp <= 0 || teamMembers.length === 0) {
      fight.phase = 'failed';
      broadcast(lobby, game, team);
      finishGame(lobby, game, otherTeam(team), 'enemy-defeat');
      return;
    }

    if (fight.enemyHp <= 0) {
      fight.phase = 'waiting';
      broadcast(lobby, game, team);
      maybeBeginSelection(lobby, game);
      return;
    }

    broadcast(lobby, game, team); 
    scheduleRound(lobby, game, team, PAUSE_MS);
  }

  function begin(lobby) {
    if (games.has(lobby.code)) return;
    const roster = lobby.players.filter(player => TEAMS.includes(player.team));
    if (!TEAMS.every(team => roster.some(player => player.team === team))) {
      throw new Error('Both teams need a player.');
    }
    if (roster.length !== lobby.players.length) {
      throw new Error('Everyone must pick a team.');
    }

    for (const player of roster) clearPlayerSelection(player);
    const makeFight = () => ({
      phase: 'combat',
      stage: 0,
      round: 0,
      knight: createKnight(),
      enemyHp: ENEMIES[0].hp,
      endsAt: null,
      taps: new Map(),
      lastRound: null,
    });
    const game = {
      teams: { red: makeFight(), blue: makeFight() },
      pvpSent: false,
      pvp: null,
      finished: null,
    };
    games.set(lobby.code, game);
    broadcastBoth(lobby, game);
    for (const team of TEAMS) scheduleRound(lobby, game, team, START_DELAY_MS);
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
      return { lobby, game, player, fight: game.teams[player.team] };
    }

    // The host isn't a player, so it reads both fights through its own event.
    socket.on('game:enemy:host:get', (code, cb) => {
      const lobby = lobbies.get(String(code ?? '').trim().toUpperCase());
      if (!lobby || lobby.hostId !== socket.id) {
        return reply(cb, { success: false, error: 'Only the host can watch this game.' });
      }
      const game = games.get(lobby.code);
      if (!game) return reply(cb, { success: false, error: 'No boss fight is running.' });
      reply(cb, { success: true, state: hostSnapshot(lobby, game) });
    });

    socket.on('game:enemy:get', (code, cb) => {
      const ctx = context(cb);
      if (!ctx) return;
      if (String(code).trim().toUpperCase() !== ctx.lobby.code) {
        return reply(cb, { success: false, error: 'Wrong session code.' });
      }
      reply(cb, { success: true, state: snapshot(ctx.lobby, ctx.game, ctx.player.team, socket.id) });
    });

    socket.on('game:enemy:tap', (move, cb) => {
      const ctx = context(cb);
      if (!ctx) return;
      if (ctx.game.finished || ctx.game.pvpSent ||
          ctx.fight.phase !== 'combat' || ctx.fight.endsAt === null ||
          Date.now() >= ctx.fight.endsAt || ctx.fight.knight.hp <= 0 ||
          !Object.hasOwn(BASE, move)) {
        return reply(cb, { success: false, error: 'Not accepting taps.' });
      }
      const taps = ctx.fight.taps.get(socket.id) || { attack: 0, block: 0, heal: 0 };
      if (taps[move] >= MAX_TAPS_PER_MOVE) {
        return reply(cb, { success: false, error: 'Tap limit reached.' });
      }
      taps[move]++;
      ctx.fight.taps.set(socket.id, taps);
      reply(cb, { success: true });
      scheduleHostTaps(ctx.lobby, ctx.game);
    });

    socket.on('game:enemy:choose', (request, cb) => {
      const ctx = context(cb);
      if (!ctx) return;
      if (ctx.game.finished || ctx.game.pvpSent || ctx.fight.phase !== 'selection') {
        return reply(cb, { success: false, error: 'Selection phase is closed.' });
      }
      if (!request || !Number.isInteger(request.stage) ||
          request.stage !== ctx.fight.stage || typeof request.itemId !== 'string') {
        return reply(cb, { success: false, error: 'Invalid stage or item request.' });
      }

      const outcome = choosePlayerUpgrade(ctx.player, ctx.fight.knight, ctx.fight.stage, request.itemId);
      if (!outcome.success) return reply(cb, outcome);

      console.info('[BUFF ACCEPTED]', {
        code: ctx.lobby.code,
        socketId: socket.id,
        playerId: ctx.player.id,
        team: ctx.player.team,
        stage: ctx.fight.stage,
        itemId: outcome.selectedUpgrade,
      });
      reply(cb, { success: true, selectedUpgrade: outcome.selectedUpgrade });
      broadcast(ctx.lobby, ctx.game, ctx.player.team);
      maybeAdvanceAfterSelections(ctx.lobby, ctx.game);
    });

    socket.on('game:pvp:get', (code, cb) => {
      const ctx = context(cb);
      if (!ctx) return;
      if (String(code).trim().toUpperCase() !== ctx.lobby.code || !ctx.game.pvp) {
        return reply(cb, { success: false, error: 'PvP not ready.' });
      }
      reply(cb, { success: true, data: ctx.game.pvp });
    });

    socket.on('game:result:get', (code, cb) => {
      const ctx = context(cb);
      if (!ctx) return;
      if (String(code).trim().toUpperCase() !== ctx.lobby.code || !ctx.game.finished) {
        return reply(cb, { success: false, error: 'No completed game yet.' });
      }
      reply(cb, { success: true, result: ctx.game.finished });
    });
  }

  return { begin, register, stop };
}

module.exports = { createEnemyGameManager };
