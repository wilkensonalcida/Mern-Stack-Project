import { useEffect, useRef, useState } from 'react';
import { socket } from '../socket/socket';
import type { Ack, EnemyState, Move, TeamId, Upgrade, UpgradeOption } from './enemyTypes';
import type { PvpState, PvpStateAck } from './pvpTypes';
// Alex's item drawings. The plain sword, the eagle shield and the potion stand for the moves,
// and in the item pick each item shows its own drawing.
import attackIcon from '../../sprites/items/sword1.png';
import heatedBladeIcon from '../../sprites/items/sword2.png';
import blockIcon from '../../sprites/items/shield1.png';
import woodShieldIcon from '../../sprites/items/shield2.png';
import gauzeIcon from '../../sprites/items/heal1.png';
import healIcon from '../../sprites/items/heal2.png';
import './Controller.css';

const moves: Move[] = ['attack', 'block', 'heal'];
const moveNames: Record<Move, string> = { attack: 'Attack', block: 'Block', heal: 'Heal' };
const moveIcons: Record<Move, string> = { attack: attackIcon, block: blockIcon, heal: healIcon };
const itemIcons: Record<Upgrade, string> = {
  sharpened_blade: attackIcon,
  heated_blade: heatedBladeIcon,
  metal_shield: blockIcon,
  wood_shield: woodShieldIcon,
  healing_potion: healIcon,
  gauze: gauzeIcon,
};
const teamNames: Record<TeamId, string> = { red: 'Red', blue: 'Blue' };
const otherTeam = (team: TeamId): TeamId => (team === 'red' ? 'blue' : 'red');
const noTaps = (): Record<Move, number> => ({ attack: 0, block: 0, heal: 0 });
const wholeSeconds = (ms: number) => (ms > 0 ? Math.ceil(ms / 1000) : undefined);

type StateAck = Ack & { state?: EnemyState };
type TapEvent = 'game:enemy:tap' | 'game:pvp:tap';
// What the phone shows right now: a tap window that's open, buttons locked under a status line, or the item pick.
type Screen =
  | { kind: 'loading' }
  | { kind: 'open'; key: string; remaining: number; total: number; event: TapEvent }
  | { kind: 'locked'; status: string; tone?: TeamId; countdown?: number; key?: string }
  | { kind: 'pick'; options: UpgradeOption[]; picked: Upgrade | null; stage: number };

type Props = { code: string; team: TeamId; nickname: string };

// A guest's phone during the game: three big buttons and one status line. The host's screen shows the fight.
export default function Controller({ code, team, nickname }: Props) {
  const [boss, setBoss] = useState<{ state: EnemyState; at: number } | null>(null);
  const [pvp, setPvp] = useState<{ state: PvpState; at: number } | null>(null);
  const [connected, setConnected] = useState(socket.connected);
  // Each window's length, from the first state that showed it open, so the bar starts full.
  const [lengths, setLengths] = useState<Record<string, number>>({});
  // The taps the server accepted in the latest window. They count only after the server says so.
  const [tally, setTally] = useState({ key: '', counts: noTaps() });
  const [picking, setPicking] = useState(false);
  const [error, setError] = useState('');
  const [now, setNow] = useState(Date.now());
  const [floats, setFloats] = useState<{ id: number; slot: number }[]>([]);
  const floatId = useRef(0);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const press = useRef<(slot: number) => void>(() => {});

  useEffect(() => {
    let mounted = true;
    const openWindow = (key: string, remainingMs: number) => {
      setLengths(known => (key in known ? known : { ...known, [key]: Math.max(remainingMs, 1) }));
      setTally(current => (current.key === key ? current : { key, counts: noTaps() }));
    };
    const onBoss = (next: EnemyState) => {
      if (!mounted || next.code !== code) return;
      setBoss({ state: next, at: Date.now() });
      if (next.phase === 'combat' && next.endsAt !== null) openWindow(`b${next.stage}:${next.round}`, next.remainingMs);
    };
    const onPvp = (next: PvpState) => {
      if (!mounted || next.code !== code) return;
      setPvp({ state: next, at: Date.now() });
      if (next.phase === 'turn' && next.turn === team) openWindow(`p${next.turnNumber}`, next.remainingMs);
    };
    const loadPvp = () => {
      socket.timeout(5000).emit('game:pvp:state:get', code, (err: Error | null, reply: PvpStateAck) => {
        if (!err && reply?.success && reply.state) onPvp(reply.state);
      });
    };
    const load = () => {
      // A phone that reconnects gets a new connection, which the game doesn't know, so PlayPage takes it out of the game.
      socket.timeout(5000).emit('game:enemy:get', code, (err: Error | null, reply: StateAck) => {
        if (mounted && !err && reply?.success && reply.state) onBoss(reply.state);
      });
      loadPvp();
    };
    const onPvpReady = (data: { code: string }) => {
      if (data.code === code) loadPvp();
    };
    const onConnect = () => {
      setConnected(true);
      load();
    };
    const onDisconnect = () => setConnected(false);

    socket.on('game:enemy:state', onBoss);
    socket.on('game:pvp:state', onPvp);
    socket.on('game:pvp-ready', onPvpReady);
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    if (socket.connected) load();
    else socket.connect();
    return () => {
      mounted = false;
      socket.off('game:enemy:state', onBoss);
      socket.off('game:pvp:state', onPvp);
      socket.off('game:pvp-ready', onPvpReady);
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, [code, team]);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 100);
    return () => window.clearInterval(interval);
  }, []);

  // Keeps the phone's screen on during the game, where the browser allows it.
  useEffect(() => {
    let lock: WakeLockSentinel | null = null;
    const request = async () => {
      if (!('wakeLock' in navigator) || document.visibilityState !== 'visible') return;
      try {
        lock = await navigator.wakeLock.request('screen');
      } catch {
        // Low battery or a browser setting can refuse it, and the game works without it.
      }
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') void request();
    };
    void request();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      void lock?.release().catch(() => {});
    };
  }, []);

  // On a computer, the 1, 2 and 3 keys press the three buttons.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const slot = ['1', '2', '3'].indexOf(event.key);
      if (slot >= 0 && !event.repeat) press.current(slot);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const tallied = (key: string) => (tally.key === key ? tally.counts : noTaps());
  const timesUp = (key: string): Screen => {
    const taps = Object.values(tallied(key)).reduce((sum, count) => sum + count, 0);
    return { kind: 'locked', status: `Time's up: ${taps} ${taps === 1 ? 'tap' : 'taps'}`, key };
  };

  function readScreen(): Screen {
    if (pvp && pvp.state.phase !== 'finished') {
      const state = pvp.state;
      const left = Math.max(0, state.remainingMs - (now - pvp.at));
      // PvP still gives each player a fighter until it gets team knights, so a phone can be knocked out.
      const me = state.players.find(player => player.id === socket.id);
      if (me && me.hp <= 0) return { kind: 'locked', status: 'Your fighter is down.' };
      if (state.phase === 'flip') {
        const status = state.turn === team ? 'You go first! Get ready.' : `${teamNames[state.turn]} goes first.`;
        return { kind: 'locked', status, tone: state.turn, countdown: wholeSeconds(left) };
      }
      const key = `p${state.turnNumber}`;
      if (state.turn !== team) {
        if (state.phase === 'pause') {
          return { kind: 'locked', status: 'Your turn next. Get ready.', tone: team, countdown: wholeSeconds(left) };
        }
        return { kind: 'locked', status: `${teamNames[state.turn]}'s turn. Get ready.`, tone: state.turn };
      }
      if (state.phase === 'turn' && left > 0) {
        return { kind: 'open', key, remaining: left, total: lengths[key] ?? left, event: 'game:pvp:tap' };
      }
      return timesUp(key);
    }

    if (!boss) return { kind: 'loading' };
    const state = boss.state;
    const enemy = state.enemy?.name ?? 'boss';
    switch (state.phase) {
      case 'combat': {
        const key = `b${state.stage}:${state.round}`;
        if (state.endsAt !== null) {
          const left = Math.max(0, state.remainingMs - (now - boss.at));
          if (left > 0) return { kind: 'open', key, remaining: left, total: lengths[key] ?? left, event: 'game:enemy:tap' };
          return timesUp(key);
        }
        // A fight's first round counts down. Between rounds, the last count stays up.
        if (state.round === 0) {
          const left = Math.max(0, state.nextRoundInMs - (now - boss.at));
          return { kind: 'locked', status: `The ${enemy}! Get ready.`, countdown: wholeSeconds(left) };
        }
        return timesUp(key);
      }
      case 'waiting':
        return { kind: 'locked', status: `${enemy} down! Waiting for ${teamNames[otherTeam(team)].toLowerCase()}.` };
      case 'selection': {
        const me = state.players.find(player => player.id === socket.id);
        return { kind: 'pick', options: me?.upgradeOptions ?? [], picked: me?.selectedUpgrade ?? null, stage: state.stage };
      }
      case 'ready':
        return { kind: 'locked', status: 'Both bosses are down. PvP is next!' };
      case 'won':
        return { kind: 'locked', status: 'Your team wins!' };
      case 'failed':
        return { kind: 'locked', status: 'Your knight fell.' };
    }
  }

  const screen = readScreen();
  const open = connected && screen.kind === 'open';

  // The button squishes and flashes, a +1 floats up, and the phone buzzes where it can.
  function feedback(slot: number) {
    const button = buttons.current[slot];
    if (button) {
      button.classList.remove('tapped');
      void button.offsetWidth;
      button.classList.add('tapped');
    }
    const id = ++floatId.current;
    setFloats(current => [...current.slice(-8), { id, slot }]);
    window.setTimeout(() => setFloats(current => current.filter(float => float.id !== id)), 600);
    navigator.vibrate?.(12);
  }

  function tap(move: Move, slot: number) {
    if (!open || screen.kind !== 'open') return;
    const { key, event } = screen;
    feedback(slot);
    socket.emit(event, move, (response: Ack) => {
      if (!response?.success) return;
      setTally(current => (current.key === key
        ? { key, counts: { ...current.counts, [move]: current.counts[move] + 1 } }
        : current));
    });
  }

  function choose(itemId: Upgrade, stage: number) {
    if (picking || !connected) return;
    setPicking(true);
    setError('');
    socket.timeout(5000).emit('game:enemy:choose', { stage, itemId }, (err: Error | null, response: Ack) => {
      setPicking(false);
      if (err || !response?.success) setError(response?.error || 'Your pick did not save. Try again.');
    });
  }

  press.current = slot => {
    if (screen.kind === 'pick') {
      const item = screen.options[slot];
      if (item && screen.picked === null) choose(item.id, screen.stage);
    } else if (open) {
      tap(moves[slot], slot);
    }
  };

  let status = '';
  let tone: TeamId | undefined;
  let countdown: number | undefined;
  if (screen.kind === 'loading') status = 'Loading…';
  else if (screen.kind === 'open') status = 'Tap!';
  else if (screen.kind === 'locked') ({ status, tone, countdown } = screen);
  else if (screen.picked) {
    const name = screen.options.find(item => item.id === screen.picked)?.name ?? 'your item';
    status = `You picked ${name}. Waiting for your team.`;
  } else status = screen.options.length ? 'Pick an item for your knight.' : 'Getting your items…';

  const countKey = screen.kind === 'open' ? screen.key : screen.kind === 'locked' ? screen.key : undefined;
  const counts = countKey ? tallied(countKey) : null;
  const barWidth = screen.kind === 'open' ? (100 * screen.remaining) / screen.total : 0;

  return (
    <div className={`controller-page team-${team}`} onContextMenu={event => event.preventDefault()}>
      <div className="controller-bar" aria-hidden="true">
        <div style={{ width: `${Math.min(100, barWidth)}%` }} />
      </div>
      <main className="controller">
        {!connected && <p className="controller-banner" role="alert">Reconnecting…</p>}
        <header className="controller-header">
          <h1 className="controller-team mb-0">{teamNames[team]} team</h1>
          <span className="controller-name">{nickname}</span>
        </header>
        <p className={`controller-status ${tone ? `tone-${tone}` : ''}`} role="status">{status}</p>
        {countdown !== undefined && <p className="controller-countdown" aria-hidden="true">{countdown}</p>}

        <div className="controller-buttons">
          {screen.kind === 'pick'
            ? screen.options.map((item, slot) => (
                <button key={item.id} type="button"
                  ref={element => { buttons.current[slot] = element; }}
                  className={`controller-button move-${item.stat} ${screen.picked === item.id ? 'picked' : ''}`}
                  disabled={!connected || picking || screen.picked !== null}
                  onClick={() => choose(item.id, screen.stage)}>
                  <img src={itemIcons[item.id]} alt="" />
                  <span>
                    <span className="controller-label">{item.name}</span>
                    <span className="controller-detail">+{Math.round(item.bonus * 100)}% {item.stat}</span>
                  </span>
                </button>
              ))
            : moves.map((move, slot) => (
                <button key={move} type="button"
                  ref={element => { buttons.current[slot] = element; }}
                  className={`controller-button move-${move}`}
                  disabled={!open}
                  onPointerDown={() => tap(move, slot)}
                  // Enter and Space press a focused button with no pointer, which reports detail 0.
                  onClick={event => { if (event.detail === 0) tap(move, slot); }}>
                  <img src={moveIcons[move]} alt="" />
                  <span className="controller-label">{moveNames[move]}</span>
                  {counts && <span className="controller-count">{counts[move]}</span>}
                  {floats.filter(float => float.slot === slot).map(float => (
                    <span key={float.id} className="controller-plus" aria-hidden="true">+1</span>
                  ))}
                </button>
              ))}
        </div>
        {error && <p className="text-danger text-center fw-semibold mb-0" role="alert">{error}</p>}
      </main>
    </div>
  );
}
