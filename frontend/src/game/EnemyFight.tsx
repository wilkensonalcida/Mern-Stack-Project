import { useEffect, useState } from 'react';
import Knight, { type KnightAnimation } from './Knight';
import Goblin from './Goblin';
import Skeleton from './Skeleton';
import type { EnemyAnimation } from './AnimateEnemy';
import type { HostBossState, HostTeamView, RoundResult, TeamId, TeamVote } from './enemyTypes';
import { itemIcons } from './itemArt';
import { HostFrame, TapCounts } from './HostFrame';

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
// The sprites' width on this screen, from the panel's --sprite in Host.css.
const spriteSize = 'var(--sprite)';

function HpBar({ label, hp, maxHp, boss = false }: { label: string; hp: number; maxHp: number; boss?: boolean }) {
  return (
    <div className={`host-hp ${boss ? 'is-boss' : ''}`}>
      <p className="host-hp-label"><span>{label}</span><span className="host-hp-value">{hp.toFixed(1)} / {maxHp} HP</span></p>
      <div className="host-hp-track" role="progressbar" aria-label={`${label} health`}
        aria-valuenow={hp} aria-valuemin={0} aria-valuemax={maxHp}>
        <div style={{ width: `${(100 * hp) / maxHp}%` }} />
      </div>
    </div>
  );
}

function columnStatus(view: HostTeamView, other: TeamId): string {
  switch (view.phase) {
    case 'combat': return view.endsAt !== null ? `Round ${view.round}` : 'Get ready';
    case 'waiting': return `${view.enemy?.name ?? 'Boss'} down! Waiting for ${teamNames[other].toLowerCase()}`;
    case 'selection': {
      const vote = view.vote;
      if (!vote) return 'Item vote';
      if (vote.closed) return `Picked ${vote.offers.find(item => item.id === vote.pick)?.name ?? 'an item'}`;
      return `Voting: ${vote.voters}/${vote.players}`;
    }
    case 'ready': return 'Ready for PvP';
    case 'won': return 'Wins!';
    case 'failed': return 'Knight down';
  }
}

// A team's item vote on the host's screen: the three offers in their moves' colors with their votes,
// then the pick, ringed, once it closes.
function VoteTiles({ vote }: { vote: TeamVote }) {
  return (
    <ul className="host-votes" aria-label="Item vote">
      {vote.offers.map(item => {
        const picked = vote.closed && vote.pick === item.id;
        const votes = vote.counts[item.id] ?? 0;
        return (
          <li className={`host-vote move-${item.stat} ${picked ? 'is-picked' : ''} ${vote.closed && !picked ? 'is-faded' : ''}`} key={item.id}>
            <span className="host-vote-art"><img src={itemIcons[item.id]} alt="" /></span>
            <span className="host-vote-name">{item.name}</span>
            <span className="host-vote-effect">+{Math.round(item.bonus * 100)}% {item.stat}</span>
            <span className="host-vote-count">{picked ? 'Picked: ' : ''}{votes} {votes === 1 ? 'vote' : 'votes'}</span>
          </li>
        );
      })}
    </ul>
  );
}

type ColumnProps = { view: HostTeamView; other: TeamId; secondsLeft: number | null; mirrored: boolean };

// One team's boss fight on the host's screen. Blue's column is red's mirrored,
// so each knight stands on its own team's side and the bosses meet in the middle.
function BossFightColumn({ view, other, secondsLeft, mirrored }: ColumnProps) {
  const animation = useRoundAnimation(view.stage, view.lastRound);
  const bossDown = view.phase === 'waiting' || view.phase === 'selection' || view.phase === 'ready';
  const { knight, enemy, lastRound } = view;

  return (
    <section className={`host-card host-panel team-${view.team} ${mirrored ? 'is-mirrored' : ''} ${view.phase === 'selection' ? 'is-voting' : ''}`}
      aria-labelledby={`${view.team}-heading`}>
      <header className="host-card-head">
        <h2 id={`${view.team}-heading`}>{teamNames[view.team]} team</h2>
        <p className="host-players">{view.players.map(player => player.name).join(', ')}</p>
      </header>
      <div className="host-status-row">
        <p className="host-status" role="status">{columnStatus(view, other)}</p>
        {secondsLeft !== null && <p className="host-timer" role="timer">{secondsLeft.toFixed(1)} s</p>}
      </div>

      <div className="host-arena">
        <div className="host-fighter">
          <Knight animation={bossDown ? 'victory' : animation.knight} mirrored={mirrored}
            label={`${teamNames[view.team]} team's knight`} size={spriteSize} />
          <HpBar label="Knight" hp={knight.hp} maxHp={knight.maxHp} />
        </div>
        <div className="host-fighter">
          {view.phase === 'combat' && enemy && <>
            {view.stage === 0
              ? <Goblin animation={animation.foe} mirrored={!mirrored} size={spriteSize} />
              : <Skeleton animation={animation.foe} mirrored={!mirrored} size={spriteSize} />}
            <HpBar label={enemy.name} hp={enemy.hp} maxHp={enemy.maxHp} boss />
          </>}
        </div>
      </div>

      {view.phase === 'combat' && <TapCounts label="Taps this round" taps={view.taps} />}
      {view.phase === 'selection' && view.vote && <VoteTiles vote={view.vote} />}
      <footer className="host-panel-foot">
        {/* The last boss round means little once the vote opens. */}
        {lastRound && view.phase !== 'selection' && <p>
          Last round: {lastRound.attack.toFixed(1)} damage, {lastRound.blocked.toFixed(1)} blocked, {lastRound.healed.toFixed(1)} healed
        </p>}
        <p className="host-muted">
          Knight's bonuses: attack ×{knight.buffs.attack.toFixed(2)}, block ×{knight.buffs.block.toFixed(2)}, heal ×{knight.buffs.heal.toFixed(2)}
        </p>
      </footer>
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
  // A round's time left, or an open item vote's.
  const secondsLeft = (view: HostTeamView) => {
    const remaining = view.endsAt !== null ? view.remainingMs
      : view.phase === 'selection' && view.vote && !view.vote.closed ? view.vote.remainingMs
      : null;
    return remaining === null ? null : Math.max(0, (remaining - (now - receivedAt)) / 1000);
  };

  return (
    <HostFrame action={<button className="host-bar-button" type="button" onClick={onEndGame}>End game</button>}>
      <main className="host-fights">
        <h1 className="visually-hidden">Boss fights, session {state.code}</h1>
        <BossFightColumn view={state.teams.red} other="blue" secondsLeft={secondsLeft(state.teams.red)} mirrored={false} />
        <BossFightColumn view={state.teams.blue} other="red" secondsLeft={secondsLeft(state.teams.blue)} mirrored />
      </main>
    </HostFrame>
  );
}
