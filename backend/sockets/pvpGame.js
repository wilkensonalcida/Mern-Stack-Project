'use strict';

const { TEAMS, MOVES, otherTeam, alive, emptyTaps, createPlayers, resolveTurn } = require('./pvpRules');

// In-memory PvP manager for the existing lobbySocket + enemyGame approach.
// MUST be registered on the same Socket.IO server and share the same lobby Map.
function createPvpGameManager(io, lobbies, options = {}) {
  const TURN_MS = options.turnMs ?? 5000;
  const FLIP_MS = options.flipMs ?? 3000;
  const PAUSE_MS = options.pauseMs ?? 2000;
  const MAX_TAPS_PER_MOVE = options.maxTapsPerMove ?? 250;
  const games = new Map();
  const timers = new Map();
  const answer = (cb, value) => { if (typeof cb === 'function') cb(value); };

  function snapshot(game) {
    return {
      code: game.code,
      phase: game.phase,
      turn: game.turn,
      turnNumber: game.turnNumber,
      endsAt: game.endsAt,
      remainingMs: game.endsAt === null ? 0 : Math.max(0, game.endsAt - Date.now()),
      players: game.players.map(p => ({ ...p, buffs: { ...p.buffs } })),
      lastTurn: game.lastTurn ? { ...game.lastTurn, casualties: [...game.lastTurn.casualties] } : null,
      winner: game.result?.winner ?? null,
    };
  }
  function broadcast(game) {
    io.to(game.code).emit('game:pvp:state', snapshot(game));
  }
  function schedule(game, delay, next) {
    clearTimeout(timers.get(game.code));
    const handle = setTimeout(() => {
      if (games.get(game.code) !== game || game.phase === 'finished') return;
      next();
    }, Math.max(0, delay));
    timers.set(game.code, handle);
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
    const resolved = resolveTurn(game.players, game.turn, game.taps);
    game.players = resolved.players;
    game.lastTurn = { ...resolved.result, turnNumber: game.turnNumber };
    game.taps.clear();
    if (resolved.winner) {
      game.phase = 'finished';
      game.endsAt = null;
      game.result = {
        code: game.code, winner: resolved.winner,
        loser: otherTeam(resolved.winner), reason: 'pvp-defeat',
      };
      clearTimeout(timers.get(game.code));
      timers.delete(game.code);
      broadcast(game);
      io.to(game.code).emit('game:finished', game.result);
      return;
    }
    game.phase = 'pause';
    game.endsAt = Date.now() + PAUSE_MS;
    broadcast(game);
    schedule(game, PAUSE_MS, () => {
      game.turn = otherTeam(game.turn);
      game.turnNumber++;
      startTurn(game);
    });
  }
  function begin(lobby, pvpData) {
    const code = lobby?.code;
    if (!code || pvpData?.code !== code) throw new Error('Invalid PvP session.');
    if (games.has(code)) return snapshot(games.get(code)); 
    const players = createPlayers(pvpData);
    const members = new Set(lobby.players.map(p => p.id));
    if (players.some(p => !members.has(p.id))) throw new Error('PvP roster mismatch.');
    const game = {
      code, players, phase: 'flip',
      turn: options.firstTeam ? options.firstTeam() : (Math.random() < 0.5 ? 'red' : 'blue'),
      turnNumber: 1, endsAt: Date.now() + FLIP_MS,
      taps: new Map(), lastTurn: null, result: null,
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
    games.delete(code);
  }
  function register(socket) {
    function context(cb) {
      const code = socket.data.lobbyCode;
      const lobby = lobbies.get(code);
      const game = games.get(code);
      const player = game?.players.find(p => p.id === socket.id);
      if (!lobby || !game || !player || !lobby.players.some(p => p.id === socket.id)) {
        answer(cb, { success: false, error: 'You are not a member of this PvP match.' });
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
      if (ctx.game.phase !== 'turn' || !ctx.game.endsAt ||
          Date.now() >= ctx.game.endsAt || ctx.game.turn !== ctx.player.team ||
          ctx.player.hp <= 0 || !MOVES.includes(move)) {
        return answer(cb, { success: false, error: 'Not accepting taps.' });
      }
      const taps = ctx.game.taps.get(ctx.player.id) || emptyTaps();
      if (taps[move] >= MAX_TAPS_PER_MOVE) {
        return answer(cb, { success: false, error: 'Tap limit reached.' });
      }
      taps[move]++;
      ctx.game.taps.set(ctx.player.id, taps);
      answer(cb, { success: true });
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
