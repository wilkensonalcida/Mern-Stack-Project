import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import Knight, { type KnightAnimation } from './Knight';
import Goblin from './Goblin';
import Skeleton from './Skeleton';
import type { EnemyAnimation } from './AnimateEnemy';
import type { HostBossState, HostTeamView, RoundResult, TeamId, TeamVote } from './enemyTypes';
import { itemIcons } from './itemArt';
import { EndButton, HostFrame, TapCounts, bonusText, formatAmount, formatHp } from './HostFrame';

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
// The sprites' width on this screen, from the stage's --sprite in Host.css.
const spriteSize = 'var(--sprite)';

type FighterProps = {
  children: ReactNode;
  label: string;
  hp: number;
  maxHp: number;
  boss?: boolean;
  // A knight that fell to the boss falls backward where it stood; -1 for a sprite drawn mirrored.
  knockedOut?: boolean;
  mirror?: 1 | -1;
  // A line under the HP bar, such as the knight's item bonuses.
  note?: string | null;
};

// A fighter on the stage: its sprite standing on the floor line, and its nameplate on the boards below.
function Fighter({ children, label, hp, maxHp, boss = false, knockedOut = false, mirror = 1, note }: FighterProps) {
  return (
    <div className={`stage-fighter ${boss ? 'is-boss' : ''} ${knockedOut ? 'is-knocked-out' : ''}`}
      style={knockedOut ? ({ '--mirror': mirror } as CSSProperties) : undefined}>
      {children}
      <div className="stage-plate">
        <p className="stage-plate-label"><span>{label}</span><span className="stage-plate-value">{formatHp(hp)} / {maxHp} HP</span></p>
        <div className="stage-hp" role="progressbar" aria-label={`${label} health`}
          aria-valuenow={hp} aria-valuemin={0} aria-valuemax={maxHp}>
          <div style={{ width: `${(100 * hp) / maxHp}%` }} />
        </div>
        {note && <p className="stage-plate-note">{note}</p>}
      </div>
    </div>
  );
}

function columnStatus(view: HostTeamView, other: TeamId): string {
  switch (view.phase) {
    case 'combat': return view.endsAt !== null ? `Round ${view.round}` : 'Get ready';
    case 'waiting': return `Waiting for ${teamNames[other].toLowerCase()}`;
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

// A team's item vote on the stage: the three offers stand on the floor in their moves' colors,
// each with its votes on the boards, and the pick rings out when the vote closes.
function VoteOffers({ vote }: { vote: TeamVote }) {
  return (
    <div className="stage-offers">
      {vote.offers.map(item => {
        const picked = vote.closed && vote.pick === item.id;
        const votes = vote.counts[item.id] ?? 0;
        return (
          <div className={`stage-offer move-${item.stat} ${picked ? 'is-picked' : ''} ${vote.closed && !picked ? 'is-faded' : ''}`} key={item.id}>
            <div className="stage-offer-tile">
              <span className="stage-offer-art"><img src={itemIcons[item.id]} alt="" /></span>
              <span className="stage-offer-name">{item.name}</span>
              <span className="stage-offer-effect">+{Math.round(item.bonus * 100)}% {item.stat}</span>
            </div>
            <div className="stage-plate">
              <span className="stage-offer-votes">{picked ? 'Picked: ' : ''}{votes} {votes === 1 ? 'vote' : 'votes'}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// The big line across the top of the arena, with what's next under it. The room watches this screen,
// so the seconds before a tap window count down, and the window itself says "Tap!".
function stageHeadline(view: HostTeamView, other: TeamId, countdown: number | undefined): { line: string; next: string | null } {
  if (view.phase === 'waiting') {
    return { line: `${view.enemy?.name ?? 'Boss'} down!`, next: `Waiting for ${teamNames[other].toLowerCase()}` };
  }
  if (view.phase === 'failed') return { line: 'K.O.!', next: 'Knight down' };
  if (view.phase === 'combat') {
    if (view.endsAt !== null) return { line: 'Tap!', next: `Round ${view.round}` };
    return { line: countdown !== undefined ? String(countdown) : 'Get ready', next: `Round ${view.round + 1}` };
  }
  return { line: columnStatus(view, other), next: null };
}

type StageProps = {
  view: HostTeamView;
  other: TeamId;
  secondsLeft: number | null;
  countdown: number | undefined;
  mirrored: boolean;
  // While the room's shared count shows over the seam, this half's own big line steps aside.
  sharedCount: boolean;
};

// One team's boss fight on the host's stage. Blue's half is red's mirrored,
// so each knight stands on its own team's side and the bosses meet in the middle.
function BossStage({ view, other, secondsLeft, countdown, mirrored, sharedCount }: StageProps) {
  const animation = useRoundAnimation(view.stage, view.lastRound);
  const bossDown = view.phase === 'waiting' || view.phase === 'selection' || view.phase === 'ready';
  const voting = view.phase === 'selection' && Boolean(view.vote);
  const headline = stageHeadline(view, other, countdown);
  const { knight, enemy, lastRound } = view;
  const windowOpen = view.phase === 'combat' && view.endsAt !== null;
  const showResult = lastRound !== null && lastRound !== undefined && !windowOpen && view.phase !== 'selection';
  // The knight's bonuses from the items its team picked, on its nameplate. While the team votes,
  // its plate is too narrow, and the vote's own pick says what's coming.
  const bonus = voting ? null : bonusText(knight.buffs);

  return (
    <section className={`stage team-${view.team} ${mirrored ? 'is-mirrored' : ''} ${voting ? 'is-voting' : ''} ${bonus ? 'has-bonus' : ''}`}
      aria-labelledby={`${view.team}-heading`}>
      <header className="stage-band">
        <h2 id={`${view.team}-heading`}>
          {teamNames[view.team]} team
          <span className="stage-players">{view.players.map(player => player.name).join(', ')}</span>
        </h2>
        {secondsLeft !== null && <p className="stage-timer" role="timer">{secondsLeft.toFixed(1)} s</p>}
      </header>

      <div className="stage-arena">
        {!sharedCount && (
          <div className="stage-headline" role="status">
            <p className="stage-moment" key={headline.line}>{headline.line}</p>
            {headline.next && <p className="stage-next">{headline.next}</p>}
          </div>
        )}
        <div className="stage-floor">
          <Fighter label="Knight" hp={knight.hp} maxHp={knight.maxHp} knockedOut={view.phase === 'failed'} mirror={mirrored ? -1 : 1} note={bonus}>
            <Knight animation={bossDown ? 'victory' : animation.knight} mirrored={mirrored}
              label={`${teamNames[view.team]} team's knight`} size={spriteSize} />
          </Fighter>
          {/* The boss stays standing over a knight it knocked out. */}
          {(view.phase === 'combat' || view.phase === 'failed') && enemy && (
            <Fighter label={enemy.name} hp={enemy.hp} maxHp={enemy.maxHp} boss>
              {view.stage === 0
                ? <Goblin animation={animation.foe} mirrored={!mirrored} size={spriteSize} />
                : <Skeleton animation={animation.foe} mirrored={!mirrored} size={spriteSize} />}
            </Fighter>
          )}
          {voting && view.vote && <VoteOffers vote={view.vote} />}
        </div>
      </div>

      <footer className="stage-foot">
        {/* The taps while a window is open, and between windows what the last round did.
            The last round means little once the vote opens. */}
        {showResult
          ? <p className="stage-result">
              Last round: {formatAmount(lastRound.attack)} damage, {formatAmount(lastRound.blocked)} blocked, {formatAmount(lastRound.healed)} healed
            </p>
          : view.phase === 'combat' && <TapCounts label="Taps this round" taps={view.taps} />}
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
  // Whole seconds until a team's next tap window opens, while one is waiting to. It holds at 1
  // until the window's state arrives, so the count never jumps back to "Get ready". The clock ticks
  // every 100 ms and can trail a state that just arrived, so a negative wait counts as none.
  const countdown = (view: HostTeamView) => {
    if (view.phase !== 'combat' || view.endsAt !== null || view.nextRoundInMs <= 0) return undefined;
    return Math.max(1, Math.ceil((view.nextRoundInMs - Math.max(0, now - receivedAt)) / 1000));
  };

  // Both teams start each boss fight together, so the room gets one shared count over the seam,
  // "3, 2, 1", then a big "Tap!" for the first second of round 1. Later rounds count in each half.
  const { red, blue } = state.teams;
  const bothFighting = red.phase === 'combat' && blue.phase === 'combat' && red.stage === blue.stage;
  const startingFight = bothFighting && red.round === 0 && blue.round === 0 && red.endsAt === null && blue.endsAt === null;
  const firstWindow = bothFighting && red.round === 1 && blue.round === 1 && red.endsAt !== null && blue.endsAt !== null;
  const [tapUntil, setTapUntil] = useState<{ stage: number; until: number } | null>(null);
  useEffect(() => {
    if (firstWindow) setTapUntil(current => (current?.stage === red.stage ? current : { stage: red.stage, until: Date.now() + 1000 }));
  }, [firstWindow, red.stage]);
  const startCount = startingFight ? countdown(red) : undefined;
  const shared = startCount !== undefined ? String(startCount)
    : firstWindow && tapUntil?.stage === red.stage && now < tapUntil.until ? 'Tap!'
    : null;

  return (
    <HostFrame action={<EndButton label="End game" confirmLabel="End for everyone?" onConfirm={onEndGame} />}>
      <main className="stage-split">
        <h1 className="visually-hidden">Boss fights, session {state.code}</h1>
        <BossStage view={red} other="blue" secondsLeft={secondsLeft(red)}
          countdown={countdown(red)} mirrored={false} sharedCount={shared !== null} />
        <BossStage view={blue} other="red" secondsLeft={secondsLeft(blue)}
          countdown={countdown(blue)} mirrored sharedCount={shared !== null} />
        {shared !== null && (
          <p className={`stage-count ${shared === 'Tap!' ? 'is-go' : ''}`} key={shared} role="status">{shared}</p>
        )}
      </main>
    </HostFrame>
  );
}
