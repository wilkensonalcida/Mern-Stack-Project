const { randomBytes, randomInt, createHash } = require('node:crypto');
const jwt = require('jsonwebtoken');
const Match = require('../models/Match');
const User = require('../models/User');
const { JWT_SECRET } = require('../config/auth');

const TEAMS = ['red', 'blue'];
const ACTIONS = ['attack', 'heal', 'block'];
const ENEMIES = [{ name: 'Goblin', hp: 100, damage: 10 }, { name: 'Skeleton', hp: 150, damage: 15 }];
const ITEMS = {
  attack: { name: 'Sword', slot: 'weapon' },
  heal: { name: 'Healing charm', slot: 'charm' },
  block: { name: 'Shield', slot: 'shield' },
};
const counts = () => ({ attack: 0, heal: 0, block: 0 });
const hash = token => createHash('sha256').update(token).digest('hex');
const fault = (message, status = 400) => Object.assign(new Error(message), { status });
const normalizeCode = code => {
  if (typeof code !== 'string' || !/^[A-Z0-9]{6}$/.test(code.trim().toUpperCase())) throw fault('Invalid match code.');
  return code.trim().toUpperCase();
};
function guestHash(actor) {
  if (typeof actor?.guestToken !== 'string' || !/^[a-f0-9]{64}$/.test(actor.guestToken)) throw fault('Player credential required.', 401);
  return hash(actor.guestToken);
}
async function verifiedHost(actor) {
  let id;
  try {
    const data = jwt.verify(actor?.token, JWT_SECRET, { algorithms: ['HS256'] });
    if (typeof data.sub !== 'string' || !/^[a-f0-9]{24}$/i.test(data.sub)) throw new Error();
    id = data.sub;
  } catch { throw fault('Host login required. Please log in again.', 401); }
  const user = await User.findById(id).select('emailVerified').lean();
  if (!user || user.emailVerified !== true) throw fault('A verified host account is required.', 403);
  return id;
}

function createMatchService(options = {}) {
  const now = options.now || Date.now;
  const roundMs = options.roundMs ?? 5000;
  const pauseMs = options.pauseMs ?? 1500;
  const selectionMs = options.selectionMs ?? 15000;
  const onChange = options.onChange || (() => {});
  const locks = new Map();
  function exclusive(code, operation) {
    const previous = locks.get(code) || Promise.resolve();
    const current = previous.catch(() => {}).then(operation);
    locks.set(code, current);
    return current.finally(() => { if (locks.get(code) === current) locks.delete(code); });
  }
  async function load(code) {
    const match = await Match.findOne({ code: normalizeCode(code) }).select('+state').lean();
    if (!match) throw fault('Match not found.', 404);
    return match;
  }
  async function identity(match, actor, hostOnly = false) {
    if (actor?.token) {
      const id = await verifiedHost(actor);
      if (String(match.hostId) === id) return { role: 'host' };
      if (hostOnly) throw fault('Only the host can do this.', 403);
    }
    if (hostOnly) throw fault('Only the host can do this.', 403);
    const player = match.state.players.find(p => p.tokenHash === guestHash(actor));
    if (!player) throw fault('Invalid player credential for this match.', 401);
    return { role: 'player', id: player.id, seq: player.seq };
  }
  function view(match, you) {
    const state = structuredClone(match.state);
    state.players = state.players.map(({ tokenHash, seq, lastTapAt, ...player }) => player);
    return { match: { ...state, code: match.code, status: match.status, revision: match.revision,
      deadline: match.deadline, createdAt: match.createdAt }, ...(you ? { you } : {}) };
  }
  async function mutate(code, change) {
    code = normalizeCode(code);
    return exclusive(code, async () => {
      for (let retry = 0; retry < 8; retry++) {
        const match = await load(code);
        const result = await change(match);
        if (result?.unchanged) return view(match, result.you);
        const saved = await Match.findOneAndUpdate({ _id: match._id, revision: match.revision }, {
          $set: { state: match.state, status: match.status, deadline: match.deadline }, $inc: { revision: 1 },
        }, { returnDocument: 'after' }).select('+state').lean();
        if (!saved) continue;
        onChange(view(saved));
        return view(saved, result?.you);
      }
      throw fault('Match busy. Please retry.', 409);
    });
  }
  function finish(match, reason, winner = null) {
    match.status = 'finished';
    match.deadline = null;
    match.state.phase = 'finished';
    match.state.endedAt = now();
    match.state.result = { reason, winner };
  }
  function openRound(match) {
    const s = match.state;
    s.phase = 'combat'; s.round++;
    for (const p of s.players) p.roundClicks = counts();
    match.deadline = now() + roundMs;
  }
  function equipmentVote(match) {
    const s = match.state;
    for (const team of TEAMS) {
      const votes = counts();
      s.players.filter(p => p.team === team && p.vote).forEach(p => votes[p.vote]++);
      const choice = ACTIONS.reduce((best, action) => votes[action] > votes[best] ? action : best, 'attack');
      const item = { ...ITEMS[choice], action: choice, multiplier: 1.25, earnedStage: s.stage + 1 };
      s.characters[team].items.push(item);
      s.characters[team].buffs[choice] = Math.round(s.characters[team].buffs[choice] * 1.25 * 100) / 100;
    }
    s.players.forEach(p => { p.vote = null; });
    s.stage++;
    s.stageRound = 0;
    if (s.stage === ENEMIES.length) s.mode = 'pvp';
    else for (const team of TEAMS) s.characters[team].enemyHp = ENEMIES[s.stage].hp;
    s.phase = 'pause'; match.deadline = now() + pauseMs;
  }
  function resolveRound(match) {
    const s = match.state;
    const effects = {};
    for (const team of TEAMS) {
      const c = s.characters[team];
      const sum = counts();
      s.players.filter(p => p.team === team).forEach(p => ACTIONS.forEach(a => { sum[a] += p.roundClicks[a]; }));
      const active = c.hp > 0 && (s.mode === 'pvp' || c.enemyHp > 0);
      const boost = action => Math.min(sum[action], 100);
      effects[team] = {
        clicks: sum,
        attack: active && sum.attack ? (6 + boost('attack') * 2) * c.buffs.attack : 0,
        heal: active ? boost('heal') * 0.5 * c.buffs.heal : 0,
        block: active ? boost('block') * 0.5 * c.buffs.block : 0,
      };
    }
    for (const team of TEAMS) {
      const c = s.characters[team], effect = effects[team];
      const incoming = s.mode === 'pvp' ? effects[team === 'red' ? 'blue' : 'red'].attack : c.enemyHp > 0 ? ENEMIES[s.stage].damage : 0;
      c.hp = Math.round(Math.max(0, Math.min(c.maxHp, c.hp + effect.heal) - Math.max(0, incoming - effect.block)) * 10) / 10;
      if (s.mode === 'npc') c.enemyHp = Math.max(0, Math.round((c.enemyHp - effect.attack) * 10) / 10);
    }
    s.lastRound = { round: s.round, mode: s.mode, effects };
    s.stageRound++;
    const dead = TEAMS.filter(t => s.characters[t].hp <= 0);
    if (dead.length) return finish(match, s.mode === 'pvp' ? 'team-defeat' : 'enemy-defeat', dead.length === 2 ? null : dead[0] === 'red' ? 'blue' : 'red');
    if (s.mode === 'npc' && TEAMS.every(t => s.characters[t].enemyHp <= 0)) {
      s.phase = 'selection'; match.deadline = now() + selectionMs; return;
    }
    if (s.stageRound >= 30) return finish(match, 'round-limit');
    s.phase = 'pause'; match.deadline = now() + pauseMs;
  }
  return {
    async create(actor, requestId) {
      const hostId = await verifiedHost(actor);
      if (requestId !== undefined && (typeof requestId !== 'string' || !/^[a-f0-9-]{36}$/i.test(requestId))) throw fault('Invalid create request.');
      const createKey = hostId + ':' + (requestId || randomBytes(16).toString('hex'));
      const existing = await Match.findOne({ createKey }).select('+state').lean();
      if (existing) return view(existing, { role: 'host' });
      if (await Match.countDocuments({ hostId, status: { $ne: 'finished' } }) >= 3) throw fault('Finish an existing match before creating another.', 409);
      for (let attempt = 0; attempt < 5; attempt++) {
        const code = Array.from({ length: 6 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[randomInt(31)]).join('');
        try {
          const match = await Match.create({ code, hostId, createKey, status: 'lobby', deadline: now() + 60 * 60 * 1000,
            state: { rulesVersion: 1, phase: 'lobby', mode: 'npc', stage: 0, round: 0, stageRound: 0, players: [], characters: {}, startedAt: null, endedAt: null, result: null, lastRound: null } });
          return view(match.toObject(), { role: 'host' });
         } catch (error) {
          if (error.code !== 11000) throw error;
          const existing = await Match.findOne({ createKey }).select('+state').lean();
          if (existing) return view(existing, { role: 'host' });
        }
      }
      throw fault('Could not allocate a match code. Retry.', 503);
    },
    async join(code, data) {
      const tokenHash = guestHash(data);
      if (typeof data.name !== 'string') throw fault('Nickname required.');
      const name = data.name.normalize('NFKC').trim();
      if (!name || name.length > 24) throw fault('Nickname must be 1–24 characters.');
      return mutate(code, match => {
        const existing = match.state.players.find(p => p.tokenHash === tokenHash);
        if (existing) return { unchanged: true, you: { role: 'player', id: existing.id, seq: existing.seq } };
        if (match.status !== 'lobby' || match.deadline <= now()) throw fault('Match already started or closed.', 409);
        if (match.state.players.length >= 40) throw fault('Lobby full.', 409);
        if (match.state.players.some(p => p.name.toLowerCase() === name.toLowerCase())) throw fault('Nickname already taken.', 409);
        const player = { id: randomBytes(12).toString('hex'), tokenHash, name, team: null, clicks: counts(), roundClicks: counts(), seq: 0, lastTapAt: 0, vote: null };
        match.state.players.push(player);
        return { you: { role: 'player', id: player.id, seq: 0 } };
      });
    },
    async get(code, actor) { const match = await load(code); return view(match, await identity(match, actor)); },
    async team(code, actor, team) {
      if (team !== null && !TEAMS.includes(team)) throw fault('Invalid team.');
      return mutate(code, async match => {
        const you = await identity(match, actor);
        if (you.role !== 'player') throw fault('Host supervises; join as a guest to play.');
        if (match.status !== 'lobby' || match.deadline <= now()) throw fault('Team selection is only available in the lobby.', 409);
        match.state.players.find(p => p.id === you.id).team = team;
        return { you };
      });
    },
    async start(code, actor) {
      return mutate(code, async match => {
        const you = await identity(match, actor, true);
        if (match.status !== 'lobby' || match.deadline <= now()) throw fault('Match already started or closed.', 409);
        const s = match.state;
        if (s.players.some(p => !p.team) || !TEAMS.every(t => s.players.some(p => p.team === t))) throw fault('Every guest must select a team, with at least one on each team.', 409);
        for (const t of TEAMS) s.characters[t] = { hp: 100, maxHp: 100, enemyHp: 100, buffs: { attack: 1, heal: 1, block: 1 }, items: [] };
        match.status = 'playing'; s.startedAt = now(); openRound(match);
        return { you };
      });
    },
    async tap(code, actor, data) {
      if (!data || !ACTIONS.includes(data.action)) throw fault('Invalid action.');
      if (!Number.isSafeInteger(data.seq) || data.seq < 1 || !Number.isSafeInteger(data.round)) throw fault('Invalid action sequence.');
      return mutate(code, async match => {
        const you = await identity(match, actor);
        if (you.role !== 'player') throw fault('Only guests can tap.', 403);
        const s = match.state, p = s.players.find(p => p.id === you.id);
        if (data.seq <= p.seq) return { unchanged: true, you };
        if (data.seq !== p.seq + 1) throw fault('Action sequence out of sync. Refresh the match.', 409);
        if (match.status !== 'playing' || s.phase !== 'combat' || s.round !== data.round || match.deadline <= now() || s.characters[p.team]?.hp <= 0 || (s.mode === 'npc' && s.characters[p.team]?.enemyHp <= 0)) throw fault('Round is not accepting taps.', 409);
        if (now() - p.lastTapAt < 60) throw fault('Tapping too fast.', 429);
        if (Object.values(p.roundClicks).reduce((a, b) => a + b, 0) >= 250) throw fault('Round tap limit reached.', 429);
        p.clicks[data.action]++; p.roundClicks[data.action]++; p.seq = data.seq; p.lastTapAt = now();
        return { you: { ...you, seq: p.seq } };
      });
    },
    async vote(code, actor, data) {
      if (!ACTIONS.includes(data?.action) || !Number.isInteger(data?.stage)) throw fault('Invalid item vote.');
      return mutate(code, async match => {
        const you = await identity(match, actor);
        if (you.role !== 'player') throw fault('Only guests vote.', 403);
        const s = match.state;
        if (match.status !== 'playing' || s.phase !== 'selection' || s.stage !== data.stage || match.deadline <= now()) throw fault('Item selection closed.', 409);
        const p = s.players.find(p => p.id === you.id);
        if (p.vote) throw fault('Vote already recorded.', 409);
        p.vote = data.action;
        return { you };
      });
    },
    async end(code, actor) {
      return mutate(code, async match => {
        const you = await identity(match, actor, true);
        if (match.status === 'finished') return { unchanged: true, you };
        finish(match, match.status === 'lobby' ? 'cancelled' : 'host-ended'); return { you };
      });
    },
    async tick() {
      if (Match.db.readyState !== 1) return;
      const due = await Match.find({ status: { $ne: 'finished' }, deadline: { $lte: now(), $ne: null } }).select('code').limit(100).lean();
      for (const row of due) await mutate(row.code, match => {
        if (match.status === 'finished' || match.deadline > now()) return { unchanged: true };
        if (match.status === 'lobby') finish(match, 'lobby-expired');
        else if (now() - match.deadline > 5 * 60 * 1000) finish(match, 'interrupted');
        else if (match.state.phase === 'combat') resolveRound(match);
        else if (match.state.phase === 'selection') equipmentVote(match);
        else openRound(match);
      });
    },
    async history(actor, page = 1) {
      const hostId = await verifiedHost(actor);
      if (!Number.isSafeInteger(page) || page < 1 || page > 10000) throw fault('Invalid page.');
      const matches = await Match.find({ hostId }).select('+state').sort({ createdAt: -1, _id: -1 }).skip((page - 1) * 20).limit(21).lean();
      return { page, hasMore: matches.length > 20, matches: matches.slice(0, 20).map(m => ({ code: m.code, status: m.status, createdAt: m.createdAt, startedAt: m.state.startedAt, endedAt: m.state.endedAt, playerCount: m.state.players.length, result: m.state.result })) };
    },
    async historyDetail(code, actor) {
      const hostId = await verifiedHost(actor);
      const match = await Match.findOne({ code: normalizeCode(code), hostId }).select('+state').lean();
      if (!match) throw fault('Match not found.', 404);
      return view(match, { role: 'host' });
    },
  };
}
module.exports = { createMatchService, verifiedHost };
