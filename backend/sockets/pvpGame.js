'use strict';

const { TEAMS, MOVES, otherTeam, emptyTaps, flipCoin, createKnights, resolveTurn } = require('./pvpRules');
const { sumTaps } = require('./enemyRules');

// In-memory PvP manager for the existing lobbySocket + enemyGame approach.
// MUST be registered on the same Socket.IO server and share the same lobby Map.
// Each team fights with one knight, and any guest on the team whose turn it is can tap.
function createPvpGameManager(io, lobbies, options = {}) {
  const TURN_MS = options.turnMs ?? 5000;
  const FLIP_MS = options.flipMs ?? 3000;
  const PAUSE_MS = options.pauseMs ?? 2000;
  const MAX_TAPS_PER_MOVE = options.maxTapsPerMove ?? 250;
  const TAPS_MS = options.tapsMs ?? 200;
  const games = new Map();
  const timers = new Map();
  const tapTimers = new Map();
  const answer = (cb, value) => { if (typeof cb === 'function') cb(value); };
  const teamPlayers = (code, team) => (lobbies.get(code)?.players ?? []).filter(p => p.team === team);

  function snapshot(game) {
    return {
      code: game.code,
      phase: game.phase,
      turn: game.turn,
      turnNumber: game.turnNumber,
      endsAt: game.endsAt,
      remainingMs: game.endsAt === null ? 0 : Math.max(0, game.endsAt - Date.now()),
      knights: Object.fromEntries(TEAMS.map(team => [team, { ...game.knights[team], buffs: { ...game.knights[team].buffs } }])),
      players: Object.fromEntries(TEAMS.map(team => [team, teamPlayers(game.code, team).map(p => p.name)])),
      // The taps of the turn in progress, from the team whose turn it is.
      taps: game.phase === 'turn'
        ? sumTaps(teamPlayers(game.code, game.turn).map(p => game.taps.get(p.id)))
        : emptyTaps(),
      lastTurn: game.lastTurn ? { ...game.lastTurn, taps: { ...game.lastTurn.taps } } : null,
      winner: game.result?.winner ?? null,
    };
  }
  // The lobby's room holds the phones and the host's screen.
  function broadcast(game) {
    io.to(game.code).emit('game:pvp:state', snapshot(game));
  }
  // Taps reach the screens at most five times a second.
  function scheduleTaps(game) {
    if (tapTimers.has(game.code)) return;
    tapTimers.set(game.code, setTimeout(() => {
      tapTimers.delete(game.code);
      if (games.get(game.code) === game && game.phase === 'turn') broadcast(game);
    }, TAPS_MS));
  }
  function schedule(game, delay, next) {
    clearTimeout(timers.get(game.code));
    const handle = setTimeout(() => {
      if (games.get(game.code) !== game || game.phase === 'finished') return;
      next();
    }, Math.max(0, delay));
    timers.set(game.code, handle);
  }
  function finish(game, winner) {
    game.phase = 'finished';
    game.endsAt = null;
    game.result = {
      code: game.code,
      winner,
      loser: otherTeam(winner),
      reason: 'pvp-defeat',
      totals: { red: { ...game.totals.red }, blue: { ...game.totals.blue } },
    };
    clearTimeout(timers.get(game.code));
    timers.delete(game.code);
    broadcast(game);
    io.to(game.code).emit('game:finished', game.result);
  }
  function startTurn(game) {
    if (game.phase === 'finished') return;
    game.phase = 'turn';
    game.endsAt = Date.now() + TURN_MS;
    game.taps = new Map();
    broadcast(game);
    schedule(game, TURN_MS, () => finishTurn(game));
  }
  function finishTurn(game) {
    if (game.phase !== 'turn') return;
    // A team whose players have all left loses.
    const emptyTeam = TEAMS.find(team => teamPlayers(game.code, team).length === 0);
    if (emptyTeam) return finish(game, otherTeam(emptyTeam));

    const ids = teamPlayers(game.code, game.turn).map(p => p.id);
    const resolved = resolveTurn(game.knights, game.turn, game.taps, ids);
    game.knights = resolved.knights;
    game.lastTurn = { ...resolved.result, turnNumber: game.turnNumber };
    game.totals[game.turn] = sumTaps([game.totals[game.turn], resolved.result.taps]);
    game.taps = new Map();
    if (resolved.winner) return finish(game, resolved.winner);

    game.phase = 'pause';
    game.endsAt = Date.now() + PAUSE_MS;
    broadcast(game);
    schedule(game, PAUSE_MS, () => {
      game.turn = otherTeam(game.turn);
      game.turnNumber++;
      startTurn(game);
    });
  }
  // The boss fights hand over each team's knight, with its HP, max HP and item
  // bonuses, and each team's taps so far, which PvP keeps adding to for the results.
  function begin(lobby, pvpData) {
    const code = lobby?.code;
    if (!code || pvpData?.code !== code) throw new Error('Invalid PvP session.');
    if (games.has(code)) return snapshot(games.get(code));
    const game = {
      code,
      knights: createKnights(pvpData),
      totals: Object.fromEntries(TEAMS.map(team => [team, sumTaps([pvpData.totals?.[team]])])),
      phase: 'flip',
      turn: options.firstTeam ? options.firstTeam() : flipCoin(),
      turnNumber: 1,
      endsAt: Date.now() + FLIP_MS,
      taps: new Map(),
      lastTurn: null,
      result: null,
    };
    if (!TEAMS.includes(game.turn)) throw new Error('Invalid coin flip.');
    games.set(code, game);
    broadcast(game);
    schedule(game, FLIP_MS, () => startTurn(game));
    return snapshot(game);
  }
  function stop(code) {
    clearTimeout(timers.get(code));
    timers.delete(code);
    clearTimeout(tapTimers.get(code));
    tapTimers.delete(code);
    games.delete(code);
  }
  function register(socket) {
    // The host can watch, and any guest in the lobby can read the match.
    function context(cb) {
      const code = socket.data.lobbyCode;
      const lobby = lobbies.get(code);
      const game = games.get(code);
      const player = lobby?.players.find(p => p.id === socket.id);
      if (!lobby || !game || (!player && lobby.hostId !== socket.id)) {
        answer(cb, { success: false, error: 'You are not in this PvP match.' });
        return null;
      }
      return { game, player };
    }
    socket.on('game:pvp:state:get', (code, cb) => {
      const ctx = context(cb);
      if (!ctx) return;
      if (String(code).trim().toUpperCase() !== ctx.game.code) {
        return answer(cb, { success: false, error: 'Wrong game code.' });
      }
      answer(cb, { success: true, state: snapshot(ctx.game) });
    });
    socket.on('game:pvp:tap', (move, cb) => {
      const ctx = context(cb);
      if (!ctx) return;
      if (!ctx.player || ctx.game.phase !== 'turn' || !ctx.game.endsAt ||
          Date.now() >= ctx.game.endsAt || ctx.game.turn !== ctx.player.team || !MOVES.includes(move)) {
        return answer(cb, { success: false, error: 'Not accepting taps.' });
      }
      const taps = ctx.game.taps.get(ctx.player.id) || emptyTaps();
      if (taps[move] >= MAX_TAPS_PER_MOVE) {
        return answer(cb, { success: false, error: 'Tap limit reached.' });
      }
      taps[move]++;
      ctx.game.taps.set(ctx.player.id, taps);
      answer(cb, { success: true });
      scheduleTaps(ctx.game);
    });
    socket.on('game:pvp:result:get', (code, cb) => {
      const ctx = context(cb);
      if (!ctx) return;
      if (String(code).trim().toUpperCase() !== ctx.game.code || !ctx.game.result) {
        return answer(cb, { success: false, error: 'No PvP result yet.' });
      }
      answer(cb, { success: true, result: { ...ctx.game.result } });
    });
  }
  return { begin, register, stop, get: code => (games.has(code) ? snapshot(games.get(code)) : null) };
}

module.exports = { createPvpGameManager };
