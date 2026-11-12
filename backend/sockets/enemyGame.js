const ENEMIES = [
  { name: 'Goblin', hp: 100, damage: 10 },
  { name: 'Skeleton', hp: 150, damage: 15 },
];
const MAX_TAPS_PER_MOVE = 250;
const TEAMS = ['red', 'blue'];
const otherTeam = team => team === 'red' ? 'blue' : 'red';
const { BASE, createKnight, resolveEnemyRound, sumTaps } = require('./enemyRules');
const {
  openVote,
  castVote,
  voteCounts,
  everyoneVoted,
  decideVote,
  applyPick,
} = require('./upgradeSelection');

function createEnemyGameManager(io, lobbies, options = {}) {
  const ROUND_MS = options.roundMs ?? 5000;
  const PAUSE_MS = options.pauseMs ?? 1500;
  const START_DELAY_MS = options.startDelayMs ?? 3000;
  const HOST_TAPS_MS = options.hostTapsMs ?? 200;
  const VOTE_MS = options.voteMs ?? 10000;
  // How long both teams' picks stay up before the next fight.
  const REVEAL_MS = options.revealMs ?? 2000;

  const games = new Map();
  const timers = new Map();
  const hostTimers = new Map();
  const key = (code, team) => `${code}:${team}`;
  const members = (lobby, team) => lobby.players.filter(p => p.team === team);
  const reply = (cb, payload) => {
    if (typeof cb === 'function') cb(payload);
  };

  function clearTimers(code) {
    for (const slot of [...TEAMS, 'reveal']) {
      const k = key(code, slot);
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

  function publicPlayer(player) {
    return { id: player.id, name: player.name, team: player.team };
  }

  // A team's item vote: its three offers, the votes of the players still on
  // the team, the time left, and the pick once it closes.
  function voteView(vote, playerIds) {
    if (!vote) return null;
    return {
      stage: vote.stage,
      offers: vote.offers.map(item => ({ ...item })),
      counts: voteCounts(vote, playerIds),
      voters: playerIds.filter(id => vote.votes.has(id)).length,
      players: playerIds.length,
      remainingMs: vote.closed ? 0 : Math.max(0, vote.endsAt - Date.now()),
      closed: vote.closed,
      pick: vote.pick,
    };
  }

  // One team's fight, as its phones and the host's screen both see it.
  function fightView(lobby, game, team) {
    const fight = game.teams[team];
    const spec = ENEMIES[fight.stage];
    const playerIds = members(lobby, team).map(player => player.id);
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
      // How long until the next round opens, while one is waiting to.
      nextRoundInMs: fight.endsAt === null && fight.startsAt ? Math.max(0, fight.startsAt - Date.now()) : 0,
      knight: { hp: fight.knight.hp, maxHp: fight.knight.maxHp, buffs: { ...fight.knight.buffs } },
      lastRound: fight.lastRound,
      vote: voteView(fight.vote, playerIds),
    };
  }

  function snapshot(lobby, game, team, viewerId) {
    return {
      code: lobby.code,
      ...fightView(lobby, game, team),
      players: members(lobby, team).map(publicPlayer),
      myVote: game.teams[team].vote?.votes.get(viewerId) ?? null,
    };
  }

  // The host's screen shows both fights side by side, with each team's taps
  // so far this round, and who has voted in the item vote.
  function hostSnapshot(lobby, game) {
    const teams = {};
    for (const team of TEAMS) {
      const fight = game.teams[team];
      const teamPlayers = members(lobby, team);
      teams[team] = {
        ...fightView(lobby, game, team),
        players: teamPlayers.map(player => ({
          id: player.id,
          name: player.name,
          voted: fight.vote?.votes.has(player.id) ?? false,
        })),
        taps: sumTaps(teamPlayers.map(player => fight.taps.get(player.id))),
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

  // Call before broadcasting, so phones can count down to the round.
  function scheduleRound(lobby, game, team, delay) {
    game.teams[team].startsAt = Date.now() + delay;
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
    fight.startsAt = null;
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
  // Once both bosses are down, each team votes on an item for its knight.
  function maybeBeginSelection(lobby, game) {
    if (game.finished || game.pvpSent) return;
    if (!TEAMS.every(team => game.teams[team].phase === 'waiting')) return;
    for (const team of TEAMS) {
      const fight = game.teams[team];
      fight.phase = 'selection';
      fight.endsAt = null;
      fight.vote = openVote(fight.stage, Date.now() + VOTE_MS);
      const k = key(lobby.code, team);
      clearTimeout(timers.get(k));
      timers.set(k, setTimeout(() => closeVote(lobby.code, team), VOTE_MS));
    }
    broadcastBoth(lobby, game);
  }

  // A team's vote closes when every player on it has voted, or when its time
  // runs out. Its pick goes onto the knight, and once both teams have picked,
  // the picks stay up for a moment before the next fight.
  function closeVote(code, team) {
    const lobby = lobbies.get(code);
    const game = games.get(code);
    if (!lobby || !game || game.finished || game.pvpSent) return;
    const fight = game.teams[team];
    if (fight.phase !== 'selection' || !fight.vote || fight.vote.closed) return;
    clearTimeout(timers.get(key(code, team)));

    const pick = decideVote(fight.vote, members(lobby, team).map(player => player.id));
    applyPick(fight.knight, pick);
    fight.vote.closed = true;
    fight.vote.pick = pick;
    console.info('[TEAM PICK]', { code, team, stage: fight.stage, pick, buffs: fight.knight.buffs });
    broadcast(lobby, game, team);

    if (TEAMS.every(t => game.teams[t].vote?.closed)) {
      const k = key(code, 'reveal');
      clearTimeout(timers.get(k));
      timers.set(k, setTimeout(() => advanceAfterVotes(lobby, game), REVEAL_MS));
    }
  }

  function advanceAfterVotes(lobby, game) {
    if (games.get(lobby.code) !== game || game.finished || game.pvpSent) return;

    const finalStage = TEAMS.every(team => game.teams[team].stage === ENEMIES.length - 1);
    if (finalStage) {
      // Each team's knight goes into PvP with the HP and item bonuses it has after the bosses.
      const knights = {};
      for (const team of TEAMS) {
        const { hp, maxHp, buffs } = game.teams[team].knight;
        knights[team] = { hp, maxHp, buffs: { ...buffs } };
      }
      // Initialize server-authoritative PvP BEFORE broadcasting the handoff.
      // If initialization fails, do not leave browsers on an unplayable PvP page.
      const handoff = { code: lobby.code, knights };
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
      fight.vote = null;
    }
    for (const team of TEAMS) scheduleRound(lobby, game, team, PAUSE_MS);
    broadcastBoth(lobby, game);
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

    scheduleRound(lobby, game, team, PAUSE_MS);
    broadcast(lobby, game, team);
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

    const makeFight = () => ({
      phase: 'combat',
      stage: 0,
      round: 0,
      knight: createKnight(),
      enemyHp: ENEMIES[0].hp,
      startsAt: null,
      endsAt: null,
      taps: new Map(),
      lastRound: null,
      vote: null,
    });
    const game = {
      teams: { red: makeFight(), blue: makeFight() },
      pvpSent: false,
      pvp: null,
      finished: null,
    };
    games.set(lobby.code, game);
    for (const team of TEAMS) scheduleRound(lobby, game, team, START_DELAY_MS);
    broadcastBoth(lobby, game);
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

    // A vote for one of the team's three items, which the player can change until the vote closes.
    socket.on('game:enemy:choose', (request, cb) => {
      const ctx = context(cb);
      if (!ctx) return;
      if (ctx.game.finished || ctx.game.pvpSent || ctx.fight.phase !== 'selection' ||
          !ctx.fight.vote || ctx.fight.vote.closed) {
        return reply(cb, { success: false, error: 'The vote is closed.' });
      }
      if (!request || !Number.isInteger(request.stage) ||
          request.stage !== ctx.fight.stage || typeof request.itemId !== 'string') {
        return reply(cb, { success: false, error: 'Invalid stage or item request.' });
      }

      const outcome = castVote(ctx.fight.vote, socket.id, request.itemId);
      if (!outcome.success) return reply(cb, outcome);
      reply(cb, { success: true, vote: outcome.itemId });

      const playerIds = members(ctx.lobby, ctx.player.team).map(player => player.id);
      if (everyoneVoted(ctx.fight.vote, playerIds)) closeVote(ctx.lobby.code, ctx.player.team);
      else broadcast(ctx.lobby, ctx.game, ctx.player.team);
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
