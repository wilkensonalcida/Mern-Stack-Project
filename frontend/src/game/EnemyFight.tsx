import { useEffect, useState } from 'react';
import PageLayout from '../components/PageLayout';
import { socket } from '../socket/socket';
import Knight, { type KnightAnimation } from './Knight';
import Goblin from './Goblin';
import Skeleton from './Skeleton';
import type { EnemyAnimation } from './AnimateEnemy';
import type {
  Ack,
  EnemyState,
  GameResult,
  HostBossState,
  HostTeamView,
  Move,
  PvpReady,
  RoundResult,
  TeamId,
  Upgrade,
} from './enemyTypes';

type Props = {
  code: string;
  onPvpReady: (data: PvpReady) => void;
  onGameFinished?: (result: GameResult) => void;
};

type StateAck = Ack & { state?: EnemyState };
type PvpAck = Ack & { data?: PvpReady };
type ResultAck = Ack & { result?: GameResult };

const moves: Move[] = ['attack', 'block', 'heal'];

// After each round, the knight swings if its team attacked and the enemy flinches, or the enemy attacks.
function useRoundAnimation(stage: number | undefined, lastRound: RoundResult | null | undefined) {
  const [animation, setAnimation] = useState<{
    knight: KnightAnimation;
    foe: EnemyAnimation;
  }>({ knight: 'idle', foe: 'idle' });
  useEffect(() => {
    if (!lastRound) return;
    setAnimation({
      knight: lastRound.attack > 0 ? 'attack' : 'idle',
      foe: lastRound.attack > 0 ? 'hit' : 'attack',
    });
    const timeout = window.setTimeout(() => setAnimation({ knight: 'idle', foe: 'idle' }), 1400);
    return () => window.clearTimeout(timeout);
  }, [stage, lastRound?.round]);
  return animation;
}

export default function EnemyFight({ code, onPvpReady, onGameFinished }: Props) {
  const sessionCode = code.trim().toUpperCase();
  const [state, setState] = useState<EnemyState | null>(null);
  const [error, setError] = useState('');
  const [result, setResult] = useState<GameResult | null>(null);
  const [pendingUpgrade, setPendingUpgrade] = useState(false);
  const [connected, setConnected] = useState(socket.connected);
  const [socketId, setSocketId] = useState<string | null>(socket.id ?? null);
  const [localEndsAt, setLocalEndsAt] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const animation = useRoundAnimation(state?.stage, state?.lastRound);

  useEffect(() => {
    let mounted = true;

    const onPvp = (data: PvpReady) => {
      if (mounted && data.code === sessionCode) onPvpReady(data);
    };

    const onFinished = (data: GameResult) => {
      if (!mounted || data.code !== sessionCode) return;
      setResult(data);
      onGameFinished?.(data);
    };

    function getPvp() {
      socket.timeout(5000).emit('game:pvp:get', sessionCode,
        (err: Error | null, response: PvpAck) => {
          if (mounted && !err && response?.success && response.data) onPvp(response.data);
        });
    }

    function getResult() {
      socket.timeout(5000).emit('game:result:get', sessionCode,
        (err: Error | null, response: ResultAck) => {
          if (mounted && !err && response?.success && response.result) onFinished(response.result);
        });
    }

    const onState = (next: EnemyState) => {
      if (!mounted || next.code !== sessionCode) return;
      setState(next);
      setLocalEndsAt(next.phase === 'combat' && next.endsAt !== null
        ? Date.now() + Math.max(0, next.remainingMs)
        : null);

      const me = next.players.find(player => player.id === socket.id);
      if (next.phase !== 'selection' || me?.selectedUpgrade != null) {
        setPendingUpgrade(false);
      }
      setError('');

      if (next.phase === 'ready') getPvp();
      if (next.phase === 'won' || next.phase === 'failed') getResult();
    };

    function load() {
      socket.timeout(5000).emit('game:enemy:get', sessionCode,
        (err: Error | null, response: StateAck) => {
          if (!mounted) return;
          if (err || !response?.success || !response.state) {
            setError(response?.error || 'Unable to load the enemy fight.');
            return;
          }
          onState(response.state);
        });
    }

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
      setPendingUpgrade(false);
    };

    socket.on('game:enemy:state', onState);
    socket.on('game:pvp-ready', onPvp);
    socket.on('game:finished', onFinished);
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    if (socket.connected) onConnect();
    else socket.connect();

    return () => {
      mounted = false;
      socket.off('game:enemy:state', onState);
      socket.off('game:pvp-ready', onPvp);
      socket.off('game:finished', onFinished);
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, [sessionCode, onPvpReady, onGameFinished]);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 100);
    return () => window.clearInterval(interval);
  }, []);

  const player = state?.players.find(member => member.id === socketId);
  const combatOpen = Boolean(connected && player && state && state.knight.hp > 0 &&
    state.phase === 'combat' && state.endsAt !== null);
  const canChoose = Boolean(connected && player &&
    state?.phase === 'selection' && player.selectionStage === state.stage &&
    player.selectedUpgrade == null && !pendingUpgrade);
  const seconds = localEndsAt === null ? '0.0' :
    Math.max(0, (localEndsAt - now) / 1000).toFixed(1);

  function tap(move: Move) {
    if (!combatOpen) return;
    socket.emit('game:enemy:tap', move, (response: Ack) => {
      if (!response?.success && response?.error !== 'Not accepting taps.') {
        setError(response?.error || 'The action was rejected.');
      }
    });
  }

  function choose(itemId: Upgrade) {
    if (!canChoose || !state) return;
    const stage = state.stage;
    setPendingUpgrade(true);
    setError('');
    console.info('[BUFF CLICK]', { code: sessionCode, socketId: socket.id, stage, itemId });
    socket.timeout(5000).emit('game:enemy:choose', { stage, itemId },
      (err: Error | null, response: Ack) => {
        setPendingUpgrade(false);
        if (err || !response?.success) {
          setError(response?.error || 'Your item choice was not saved. Try again.');
        }
      });
  }

  if (!state) {
    return <PageLayout><p role="status">{error || 'Loading enemy fight…'}</p></PageLayout>;
  }
  if (!connected) {
    return <PageLayout><p role="status">Connection lost. Reconnecting…</p></PageLayout>;
  }
  if (!player) {
    return <PageLayout><p role="alert">Your current connection is not registered in this battle. Rejoin the lobby.</p></PageLayout>;
  }

  if (result || state.phase === 'won' || state.phase === 'failed') {
    const title = result
      ? `${result.winner.toUpperCase()} team wins!`
      : state.phase === 'won' ? 'Your team wins!' : 'Your team was defeated';
    return (
      <PageLayout>
        <section className="card p-4 text-center" role="status">
          <h1>{title}</h1>
          <p>{result ? 'Preparing results…' : 'Loading final results…'}</p>
        </section>
      </PageLayout>
    );
  }

  const knight = state.knight;
  const selectedCount = state.players.filter(member => member.selectedUpgrade != null).length;
  const offeredItems = player.upgradeOptions ?? [];
  const chosenName = offeredItems.find(item => item.id === player.selectedUpgrade)?.name
    ?? player.selectedUpgrade;
  const heading = state.phase === 'selection' ? 'Choose an upgrade'
    : state.phase === 'waiting' ? 'Waiting for the other team'
    : state.phase === 'ready' ? 'PvP is starting'
    : state.endsAt === null ? 'Preparing next round…' : `Round ${state.round}`;
  const status = state.phase === 'selection'
    ? (player.selectedUpgrade != null
      ? `You selected ${chosenName}. Waiting for your team…`
      : 'Choose one item. Your offers belong to you, and your choice is permanent.')
    : state.phase === 'waiting' ? 'Enemy defeated! Waiting for the other team.'
    : state.phase === 'ready' ? 'Both teams finished their enemy fights.'
    : state.lastRound ? `Previous round: team dealt ${state.lastRound.attack.toFixed(1)} damage.`
    : 'Tap Attack, Block, or Heal during the round.';
  const enemy = state.enemy;

  return (
    <PageLayout wide>
      <div className="d-flex flex-column" style={{ minHeight: 'calc(100vh - 3rem)', paddingBottom: 100 }}>
        <section className="card">
          <div className="card-body py-4">
            <div className="row align-items-center row-gap-3">
              <div className="col-md-4 order-2 order-md-1 text-center text-md-start">
                <h2 className="h5">{state.team.toUpperCase()} team</h2>
                <p className="mb-1">Knight: {knight.hp.toFixed(1)} / {knight.maxHp} HP</p>
                <div className="progress" role="progressbar" aria-label="Your knight's health"
                  aria-valuenow={knight.hp} aria-valuemin={0} aria-valuemax={knight.maxHp}>
                  <div className="progress-bar bg-success"
                    style={{ width: `${100 * knight.hp / knight.maxHp}%` }} />
                </div>
              </div>
              <div className="col-md-4 order-1 order-md-2 text-center">
                <h1 className="h4 mb-1">{heading}</h1>
                {state.phase === 'combat' && state.endsAt !== null &&
                  <p className="display-6 mb-0" role="timer">{seconds} s</p>}
              </div>
              <div className="col-md-4 order-3 text-center text-md-end">
                <h2 className="h5">{enemy?.name ?? 'Enemy defeated'}</h2>
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

        <p className="fs-5 text-center mt-3 mb-0" role="status" style={{ minHeight: '1.5em' }}>{status}</p>
        {state.phase === 'selection' && <p className="text-center text-body-secondary">
          Your team: {selectedCount}/{state.players.length} players selected.
          Both teams must complete their own choices before the next phase.
        </p>}
        {state.phase === 'selection' && player.selectedUpgrade == null && offeredItems.length === 0 &&
          <p className="text-danger text-center" role="alert">
            No item offers received. Verify that the updated backend is deployed with this frontend.
          </p>}
        {error && <p className="text-danger text-center" role="alert">{error}</p>}

        <section className="flex-grow-1 d-flex align-items-center justify-content-around py-4" aria-label="Arena">
          <Knight animation={state.phase === 'waiting' || state.phase === 'ready' ? 'victory' : animation.knight}
            label="Your knight" />
          {state.phase === 'combat' && (state.stage === 0
            ? <Goblin animation={animation.foe} />
            : <Skeleton animation={animation.foe} />)}
        </section>
        <div className="text-center text-body-secondary">
          Team members: {state.players.map(member => member.name).join(' · ')}
        </div>
        <div className="text-center small text-body-secondary">
          Knight's buffs: attack ×{knight.buffs.attack.toFixed(2)}, block ×{knight.buffs.block.toFixed(2)}, heal ×{knight.buffs.heal.toFixed(2)}
        </div>
      </div>

      <div className="position-fixed bottom-0 start-0 end-0 bg-body border-top p-3 d-flex justify-content-center gap-2 flex-wrap">
        {state.phase === 'selection'
          ? offeredItems.map(item => (
              <button key={item.id} type="button" className="btn btn-outline-dark"
                disabled={!canChoose} title={item.description}
                onClick={() => choose(item.id)}>
                {item.name} (+{Math.round(item.bonus * 100)}% {item.stat})
              </button>
            ))
          : moves.map(move => (
              <button key={move} type="button" className="btn btn-dark"
                disabled={!combatOpen} onClick={() => tap(move)}>
                {move[0].toUpperCase() + move.slice(1)}
              </button>
            ))}
      </div>
    </PageLayout>
  );
}

const teamNames: Record<TeamId, string> = { red: 'Red', blue: 'Blue' };
const teamText: Record<TeamId, string> = { red: 'text-danger', blue: 'text-primary' };
const spriteWidth = 'min(250px, 40vw)';

function HpBar({ label, hp, maxHp, barClass }: { label: string; hp: number; maxHp: number; barClass: string }) {
  return (
    <div className="mt-2" style={{ width: spriteWidth }}>
      <p className="mb-1">{label}: {hp.toFixed(1)} / {maxHp} HP</p>
      <div className="progress" role="progressbar" aria-label={`${label} health`}
        aria-valuenow={hp} aria-valuemin={0} aria-valuemax={maxHp}>
        <div className={`progress-bar ${barClass}`} style={{ width: `${100 * hp / maxHp}%` }} />
      </div>
    </div>
  );
}

function columnStatus(view: HostTeamView, other: TeamId): string {
  switch (view.phase) {
    case 'combat': return view.endsAt !== null ? `Round ${view.round}` : 'Get ready';
    case 'waiting': return `${view.enemy?.name ?? 'Boss'} down! Waiting for ${teamNames[other].toLowerCase()}`;
    case 'selection': {
      const picked = view.players.filter(player => player.picked).length;
      return `Picking items: ${picked}/${view.players.length}`;
    }
    case 'ready': return 'Ready for PvP';
    case 'won': return 'Wins!';
    case 'failed': return 'Knight down';
  }
}

type ColumnProps = { view: HostTeamView; other: TeamId; secondsLeft: number | null; mirrored: boolean };

// One team's boss fight on the host's screen. Blue's column is red's mirrored,
// so each knight stands on its own team's side and the bosses meet in the middle.
function BossFightColumn({ view, other, secondsLeft, mirrored }: ColumnProps) {
  const animation = useRoundAnimation(view.stage, view.lastRound);
  const bossDown = view.phase === 'waiting' || view.phase === 'selection' || view.phase === 'ready';
  const totalTaps = view.taps.attack + view.taps.block + view.taps.heal;
  const reverse = mirrored ? 'flex-row-reverse' : '';
  const { knight, enemy, lastRound } = view;

  return (
    <section className={`card h-100 ${mirrored ? 'text-end' : ''}`} aria-labelledby={`${view.team}-heading`}>
      <div className="card-body d-flex flex-column p-4">
        <div className={`d-flex align-items-baseline justify-content-between gap-3 ${reverse}`}>
          <h2 className={`h3 mb-0 ${teamText[view.team]}`} id={`${view.team}-heading`}>{teamNames[view.team]} team</h2>
          <p className="text-body-secondary mb-0 text-truncate">{view.players.map(player => player.name).join(', ')}</p>
        </div>
        <div className={`d-flex align-items-baseline justify-content-between gap-3 mt-2 ${reverse}`}>
          <p className="fs-3 fw-semibold mb-0" role="status">{columnStatus(view, other)}</p>
          {secondsLeft !== null && <p className="display-6 mb-0" role="timer">{secondsLeft.toFixed(1)} s</p>}
        </div>

        <div className={`d-flex align-items-end justify-content-around flex-grow-1 py-4 ${reverse}`}>
          <div className="d-flex flex-column align-items-center">
            <Knight animation={bossDown ? 'victory' : animation.knight} mirrored={mirrored}
              label={`${teamNames[view.team]} team's knight`} />
            <HpBar label="Knight" hp={knight.hp} maxHp={knight.maxHp} barClass="bg-success" />
          </div>
          <div className="d-flex flex-column align-items-center" style={{ minWidth: spriteWidth }}>
            {view.phase === 'combat' && enemy && <>
              {view.stage === 0
                ? <Goblin animation={animation.foe} mirrored={!mirrored} />
                : <Skeleton animation={animation.foe} mirrored={!mirrored} />}
              <HpBar label={enemy.name} hp={enemy.hp} maxHp={enemy.maxHp} barClass="bg-danger" />
            </>}
          </div>
        </div>

        {view.phase === 'combat' && <>
          <p className="fs-2 fw-semibold mb-0">Taps this round: {totalTaps}</p>
          <p className="text-body-secondary mb-2">
            Attack {view.taps.attack} · Block {view.taps.block} · Heal {view.taps.heal}
          </p>
        </>}
        {lastRound && <p className="mb-1">
          Last round: {lastRound.attack.toFixed(1)} damage, {lastRound.blocked.toFixed(1)} blocked, {lastRound.healed.toFixed(1)} healed
        </p>}
        <p className="small text-body-secondary mb-0">
          Knight's bonuses: attack ×{knight.buffs.attack.toFixed(2)}, block ×{knight.buffs.block.toFixed(2)}, heal ×{knight.buffs.heal.toFixed(2)}
        </p>
      </div>
    </section>
  );
}

type HostBossFightsProps = {
  state: HostBossState;
  // When this screen got the state, so each round's timer counts from the server's remainingMs, not this computer's clock.
  receivedAt: number;
  onEndGame: () => void;
};

// The host's screen during the boss fights: red's fight on the left, blue's on the right, and no tap buttons.
export function HostBossFights({ state, receivedAt, onEndGame }: HostBossFightsProps) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 100);
    return () => window.clearInterval(interval);
  }, []);
  const secondsLeft = (view: HostTeamView) => view.endsAt === null
    ? null
    : Math.max(0, (view.remainingMs - (now - receivedAt)) / 1000);

  return (
    <main className="container-fluid px-4 pt-4" style={{ paddingBottom: 88 }}>
      <h1 className="visually-hidden">Boss fights, session {state.code}</h1>
      <div className="row g-4">
        <div className="col-12 col-lg-6">
          <BossFightColumn view={state.teams.red} other="blue" secondsLeft={secondsLeft(state.teams.red)} mirrored={false} />
        </div>
        <div className="col-12 col-lg-6">
          <BossFightColumn view={state.teams.blue} other="red" secondsLeft={secondsLeft(state.teams.blue)} mirrored />
        </div>
      </div>
      <div className="position-fixed bottom-0 start-0 end-0 p-3 bg-body">
        <button className="btn btn-outline-dark" type="button" onClick={onEndGame}>End game</button>
      </div>
    </main>
  );
}
