import { useEffect, useState } from 'react';
import Knight, { type KnightAnimation } from './Knight';
import Goblin from './Goblin';
import Skeleton from './Skeleton';
import type { EnemyAnimation } from './AnimateEnemy';
import type { HostBossState, HostTeamView, RoundResult, TeamId } from './enemyTypes';

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
