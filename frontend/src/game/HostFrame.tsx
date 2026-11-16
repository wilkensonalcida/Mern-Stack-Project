import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import type { Buffs, Move, TeamId } from './enemyTypes';
import './Host.css';

const moves: Move[] = ['attack', 'block', 'heal'];

type HostFrameProps = {
  // The host's one control on this screen, such as End game, at the bar's right.
  action?: ReactNode;
  // The fight screens sit on a dark hand drawn ground, the results on the winner's paint, and the rest on white canvas.
  dark?: boolean;
  // The boss fights give each team's half its own copy of the dark ground, blue's mirrored.
  split?: boolean;
  team?: TeamId;
  children: ReactNode;
};

// Every screen the host's laptop or projector shows: the game's name lettered across the top, then the screen.
export function HostFrame({ action, dark = false, split = false, team, children }: HostFrameProps) {
  return (
    <div className={`host-page ${dark ? 'is-dark' : ''} ${split ? 'is-split' : ''} ${team ? `is-painted team-${team}` : ''}`}>
      <header className="host-bar">
        <span className="host-brand">Fight Me Bro</span>
        {action}
      </header>
      {children}
    </div>
  );
}

type EndButtonProps = {
  label: string;
  // What the pill asks once armed, such as "End for everyone?".
  confirmLabel: string;
  onConfirm: () => void;
  disabled?: boolean;
};

// The host bar's one control ends the game on every phone, so it takes two clicks:
// the first arms it for 3 seconds, and the second ends the game.
export function EndButton({ label, confirmLabel, onConfirm, disabled }: EndButtonProps) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const timeout = window.setTimeout(() => setArmed(false), 3000);
    return () => window.clearTimeout(timeout);
  }, [armed]);
  return (
    <button className={`host-bar-button ${armed ? 'is-armed' : ''}`} type="button" disabled={disabled}
      onClick={() => (armed ? onConfirm() : setArmed(true))}>
      {armed ? confirmLabel : label}
    </button>
  );
}

// The projector shows whole numbers (Nathan, 2026-11-13: "Whole numbers"). HP rounds up,
// so a knight or boss that's still standing never shows 0.
export function formatHp(value: number): string {
  return String(Math.ceil(value));
}

// A knight's item bonuses in the vote's own words, such as "+25% heal", or null before any pick.
export function bonusText(buffs: Buffs): string | null {
  const parts = moves.flatMap(move => {
    const percent = Math.round((buffs[move] - 1) * 100);
    return percent > 0 ? [`+${percent}% ${move}`] : [];
  });
  return parts.length > 0 ? parts.join(', ') : null;
}

// Damage, blocks, heals, and shields round to the nearest whole number.
export function formatAmount(value: number): string {
  return String(Math.round(value));
}

// A host screen with one message, such as while the lobby loads.
export function HostMessage({ title, live, action }: { title: string; live?: 'status' | 'alert'; action?: ReactNode }) {
  return (
    <HostFrame>
      <main className="host-message" role={live}>
        <h1>{title}</h1>
        {action}
      </main>
    </HostFrame>
  );
}

type TapCountsProps = {
  // What the count is, for screen readers, such as "Taps this round".
  label: string;
  taps: Record<Move, number>;
  // The team tapping, in PvP.
  tone?: TeamId;
};

// A tap window's running total, lettered under the clock, with each move's count on a dab of its paint.
export function TapCounts({ label, taps, tone }: TapCountsProps) {
  const total = taps.attack + taps.block + taps.heal;
  return (
    <div className={`host-taps ${tone ? `team-${tone}` : ''}`} aria-label={label}>
      <p className="host-taps-total">
        <span className="host-taps-number">{total}</span> {total === 1 ? 'tap' : 'taps'}
      </p>
      <ul className="host-move-chips" aria-label={`${label}, by move`}>
        {moves.map(move => (
          <li className={`move-${move}`} key={move} aria-label={`${move} ${taps[move]}`}>{taps[move]}</li>
        ))}
      </ul>
    </div>
  );
}

// The clock: a brush stroke that drains from the right as a tap window, a vote, or a turn runs out,
// over a faint stroke that stays as the track. The same clock sits under the big word on the phones.
export function Clock({ fraction }: { fraction: number | null }) {
  const left = fraction === null ? 0 : Math.max(0, Math.min(1, fraction));
  return (
    <div className="host-clock" aria-hidden="true">
      <i style={{ '--left': `${left * 100}%` } as CSSProperties} />
    </div>
  );
}

// The server sends only the time left, so each window's full length is the most this screen has seen of it,
// keyed by the window, which makes the clock start full.
export function useWindowLengths() {
  const lengths = useRef<Record<string, number>>({});
  return (key: string, remainingMs: number) => {
    const known = lengths.current[key];
    if (known === undefined || remainingMs > known) lengths.current[key] = remainingMs;
    return lengths.current[key];
  };
}
