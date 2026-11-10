import { useEffect, useState } from 'react';
import PageLayout from '../components/PageLayout';
import { socket } from '../socket/socket';
import Knight, { type KnightAnimation } from './Knight';
import Goblin from './Goblin';
import Skeleton from './Skeleton';
import type { EnemyAnimation } from './AnimateEnemy';
import type { Ack, EnemyState, Move, PvpReady, Upgrade } from './enemyTypes';

type Props = {
  code: string;
  onPvpReady: (data: PvpReady) => void;
};

const upgrades: { id: Upgrade; name: string; description: string }[] = [
  { id: 'attack', name: 'Sharpened Blade', description: '+25% attack per click' },
  { id: 'block', name: 'Reinforced Shield', description: '+25% blocked damage per click' },
  { id: 'heal', name: 'Healing Charm', description: '+25% healing per click' },
];

// The server controls action windows and damage. This component only renders
// incoming state, animates sprites, and sends player input.
export default function EnemyFight({ code, onPvpReady }: Props) {
  const [state, setState] = useState<EnemyState | null>(null);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const [connected, setConnected] = useState(socket.connected);
  const [socketId, setSocketId] = useState<string | null>(socket.id ?? null);
  const [localEndsAt, setLocalEndsAt] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const [animation, setAnimation] = useState<{
    knight: KnightAnimation;
    foe: EnemyAnimation;
  }>({ knight: 'idle', foe: 'idle' });

  useEffect(() => {
    let mounted = true;
    const normalizedCode = code.toUpperCase();

    const onState = (next: EnemyState) => {
      if (!mounted || next.code !== normalizedCode) return;
      setState(next);
      // Convert the SERVER's remaining duration into a LOCAL UI deadline.
      // This fixes misleading countdowns caused by clock skew.
      setLocalEndsAt(next.endsAt !== null
        ? Date.now() + next.remainingMs
        : null);
      setPending(false);
      setError('');
    };

    const onPvp = (data: PvpReady) => {
      if (mounted && data.code === normalizedCode) onPvpReady(data);
    };

    const load = () => {
      socket.timeout(5000).emit('game:enemy:get', normalizedCode,
        (err: Error | null, response: { success: boolean; state?: EnemyState; error?: string }) => {
          if (!mounted) return;
          if (err || !response?.success || !response.state) {
            setError(response?.error || 'Could not load enemy fight.');
            return;
          }
          onState(response.state);
          if (response.state.phase === 'ready') {
            socket.timeout(5000).emit('game:pvp:get', normalizedCode,
              (pvpErr: Error | null, pvpReply: { success: boolean; data?: PvpReady }) => {
                if (mounted && !pvpErr && pvpReply?.success && pvpReply.data) {
                  onPvpReady(pvpReply.data);
                }
              });
          }
        });
    };

    const onConnect = () => {
      if (!mounted) return;
      setConnected(true);
      setSocketId(socket.id ?? null);
      load();
    };
    const onDisconnect = () => {
      if (!mounted) return;
      setConnected(false);
      setSocketId(null);
      setLocalEndsAt(null);
    };

    socket.on('game:enemy:state', onState);
    socket.on('game:pvp-ready', onPvp);
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    if (socket.connected) onConnect();
    else socket.connect();

    return () => {
      mounted = false;
      socket.off('game:enemy:state', onState);
      socket.off('game:pvp-ready', onPvp);
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, [code, onPvpReady]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 100);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!state?.lastRound) return;
    setAnimation({
      knight: state.lastRound.attack > 0 ? 'attack' : 'idle',
      foe: state.lastRound.attack > 0 ? 'hit' : 'attack',
    });
    const timer = window.setTimeout(() => setAnimation({ knight: 'idle', foe: 'idle' }), 1400);
    return () => window.clearTimeout(timer);
  }, [state?.stage, state?.lastRound?.round]);

  const player = state?.players.find(p => p.id === socketId);
  const active = Boolean(connected && player && player.hp > 0 &&
    state?.phase === 'combat' && state.endsAt !== null);
  const seconds = localEndsAt === null ? '0.0' :
    Math.max(0, (localEndsAt - now) / 1000).toFixed(1);

  function tap(move: Move) {
    if (!active) return;
    socket.emit('game:enemy:tap', move, (reply: Ack) => {
      if (!reply?.success && reply?.error !== 'Not accepting taps.') {
        setError(reply?.error || 'Attack was rejected.');
      }
    });
  }

  function choose(upgrade: Upgrade) {
    if (pending || state?.phase !== 'selection' || !player || player.selected) return;
    setPending(true);
    socket.timeout(5000).emit('game:enemy:choose', upgrade,
      (err: Error | null, reply: Ack) => {
        setPending(false);
        if (err || !reply?.success) setError(reply?.error || 'Selection failed. Try again.');
      });
  }

  if (error && !state) return <PageLayout><p className="text-danger" role="alert">{error}</p></PageLayout>;
  if (!state) return <PageLayout><p role="status">Loading enemy fight…</p></PageLayout>;
  if (!connected) return <PageLayout><p role="status">Connection lost. Reconnecting…</p></PageLayout>;
  if (!player) return <PageLayout><p role="alert">You are not assigned to this team's fight. Rejoin the lobby if your session was interrupted.</p></PageLayout>;

  const enemy = state.enemy;
  const heading = state.phase === 'selection' ? 'Choose an upgrade' :
    state.phase === 'waiting' ? 'Waiting for the other team' :
    state.phase === 'ready' ? 'Both teams ready for PvP' :
    state.phase === 'failed' ? 'Team defeated' :
    state.phase === 'won' ? 'Your team wins!' :
    state.endsAt === null ? 'Preparing next round…' : `Round ${state.round}`;

  const status = state.phase === 'selection'
    ? (player.selected ? 'Selection saved. Waiting for all players…' : 'Select one permanent upgrade.')
    : state.phase === 'waiting' ? 'Enemy defeated! Waiting for the other team to finish.'
    : state.phase === 'ready' ? 'Enemy fights complete. Loading PvP…'
    : state.phase === 'failed' ? 'Your team has been defeated. Loading results…'
    : state.phase === 'won' ? 'The other team was defeated. Loading results…'
    : state.lastRound ? `Previous round: team dealt ${state.lastRound.attack.toFixed(1)} damage.`
    : 'Tap Attack, Block, or Heal during the round.';

  return (
    <PageLayout wide>
      <div className="d-flex flex-column" style={{ minHeight: 'calc(100vh - 3rem)', paddingBottom: 88 }}>
        <section className="card">
          <div className="card-body py-4">
            <div className="row align-items-center row-gap-3">
              <div className="col-md-4 order-2 order-md-1 text-center text-md-start">
                <h2 className="h5">{state.team.toUpperCase()} team</h2>
                <p className="mb-1">{player.name}: {player.hp.toFixed(1)} / {player.maxHp} HP</p>
                <div className="progress" role="progressbar" aria-label="Your health"
                  aria-valuenow={player.hp} aria-valuemin={0} aria-valuemax={player.maxHp}>
                  <div className="progress-bar bg-success"
                    style={{ width: `${100 * player.hp / player.maxHp}%` }} />
                </div>
              </div>
              <div className="col-md-4 order-1 order-md-2 text-center">
                <h1 className="h4 mb-1">{heading}</h1>
                {state.phase === 'combat' && state.endsAt !== null &&
                  <p className="display-6 mb-0" role="timer">{seconds} s</p>}
              </div>
              <div className="col-md-4 order-3 text-center text-md-end">
                <h2 className="h5">{enemy?.name || 'Enemy defeated'}</h2>
                {enemy && <>
                  <p className="mb-1">{enemy.hp.toFixed(1)} / {enemy.maxHp} HP</p>
                  <div className="progress" role="progressbar" aria-label="Enemy health"
                    aria-valuenow={enemy.hp} aria-valuemin={0} aria-valuemax={enemy.maxHp}>
                    <div className="progress-bar bg-danger"
                      style={{ width: `${100 * enemy.hp / enemy.maxHp}%` }} />
                  </div>
                </>}
              </div>
            </div>
          </div>
        </section>

        <p className="text-center mt-3 mb-0" role="status" style={{ minHeight: '1.5em' }}>{status}</p>
        {error && <p className="text-danger text-center" role="alert">{error}</p>}
        <section className="flex-grow-1 d-flex align-items-center justify-content-around py-4" aria-label="Arena">
          <Knight animation={state.phase === 'ready' || state.phase === 'waiting' || state.phase === 'won' ? 'victory' : animation.knight}
            label="Your knight" />
          {state.phase === 'combat' && (state.stage === 0
            ? <Goblin animation={animation.foe} />
            : <Skeleton animation={animation.foe} />)}
        </section>
        <div className="text-center text-body-secondary">
          Team members: {state.players.map(p => `${p.name} (${p.hp.toFixed(1)} HP)`).join(' · ')}
        </div>
        <div className="text-center small text-body-secondary">
          Buffs: attack ×{player.buffs.attack.toFixed(2)}, block ×{player.buffs.block.toFixed(2)}, heal ×{player.buffs.heal.toFixed(2)}
        </div>
      </div>
      <div className="position-fixed bottom-0 start-0 end-0 bg-body border-top p-3 d-flex justify-content-center gap-2 flex-wrap">
        {state.phase === 'selection'
          ? upgrades.map(item => <button key={item.id} className="btn btn-outline-dark" type="button"
              disabled={pending || player.selected || player.hp <= 0}
              title={item.description} onClick={() => choose(item.id)}>{item.name}</button>)
          : (['attack', 'block', 'heal'] as Move[]).map(move =>
            <button key={move} className="btn btn-dark" type="button"
              disabled={!active} onClick={() => tap(move)}>
              {move[0].toUpperCase() + move.slice(1)}
            </button>)}
      </div>
    </PageLayout>
  );
}
