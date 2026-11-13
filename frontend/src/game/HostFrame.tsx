import type { ReactNode } from 'react';
import type { Move, TeamId } from './enemyTypes';
import './Host.css';

const moves: Move[] = ['attack', 'block', 'heal'];
const moveNames: Record<Move, string> = { attack: 'Attack', block: 'Block', heal: 'Heal' };

type HostFrameProps = {
  // The host's one control on this screen, such as End game, at the bar's right.
  action?: ReactNode;
  children: ReactNode;
};

// Every screen the host's laptop or projector shows: an ink bar with the game's name, then the screen.
export function HostFrame({ action, children }: HostFrameProps) {
  return (
    <div className="host-page">
      <header className="host-bar">
        <span className="host-brand">Fight Me Bro</span>
        {action}
      </header>
      {children}
    </div>
  );
}

// HP, damage, and shields as whole numbers when they are, and to one decimal place when they aren't.
export function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
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
  label: string;
  taps: Record<Move, number>;
  // The team tapping, whose color the total takes in PvP.
  tone?: TeamId;
};

// A tap window's running total, with each move's count in its own color.
export function TapCounts({ label, taps, tone }: TapCountsProps) {
  const total = taps.attack + taps.block + taps.heal;
  return (
    <div className={`host-taps ${tone ? `team-${tone}` : ''}`}>
      <p className="host-taps-total">
        <span className="host-taps-label">{label}</span>
        <span className="host-taps-number">{total}</span>
      </p>
      <ul className="host-move-chips" aria-label={`${label}, by move`}>
        {moves.map(move => <li className={`move-${move}`} key={move}>{moveNames[move]} {taps[move]}</li>)}
      </ul>
    </div>
  );
}
