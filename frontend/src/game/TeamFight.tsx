import { useEffect, useState, type CSSProperties } from 'react';
import { socket } from '../socket/socket';
import type { TeamId } from './enemyTypes';
import type { PvpState, PvpStateAck } from './pvpTypes';
import Knight, { type KnightAnimation } from './Knight';
import { describeTurn } from './pvpText';
import { Clock, EndButton, HostFrame, HostMessage, TapCounts, bonusText, formatAmount, formatHp, useWindowLengths } from './HostFrame';

const teamNames: Record<TeamId, string> = { red: 'Red team', blue: 'Blue team' };
const otherTeam = (team: TeamId): TeamId => (team === 'red' ? 'blue' : 'red');
const teams: TeamId[] = ['red', 'blue'];

type TeamFightProps = {
  code: string;
  onEndGame: () => void;
};

// The host's screen during PvP: the scoreboard, the two knights facing each other,
// the live tap count, and what each turn did. The phones hold the controls.
export default function TeamFight({ code, onEndGame }: TeamFightProps) {
  const [pvp, setPvp] = useState<{ state: PvpState; at: number } | null>(null);
  const [error, setError] = useState('');
  const [now, setNow] = useState(Date.now());
  const windowLength = useWindowLengths();

  useEffect(() => {
    let mounted = true;
    const onState = (next: PvpState) => {
      if (mounted && next.code === code) setPvp({ state: next, at: Date.now() });
    };
    const load = () => {
      socket.timeout(5000).emit('game:pvp:state:get', code, (err: Error | null, reply: PvpStateAck) => {
        if (!mounted) return;
        if (err || !reply?.success || !reply.state) {
          setError(reply?.error || 'Unable to load PvP.');
          return;
        }
        setError('');
        onState(reply.state);
      });
    };
    socket.on('game:pvp:state', onState);
    socket.on('connect', load);
    if (socket.connected) load();
    return () => {
      mounted = false;
      socket.off('game:pvp:state', onState);
      socket.off('connect', load);
    };
  }, [code]);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 100);
    return () => window.clearInterval(interval);
  }, []);

  if (!pvp) return <HostMessage title={error || 'Loading PvP…'} live={error ? 'alert' : 'status'} />;
  const { state } = pvp;
  // The clock ticks every 100 ms, so it can trail a state that just arrived; a negative wait would add a second.
  const seconds = state.endsAt === null ? null : Math.max(0, (state.remainingMs - Math.max(0, now - pvp.at)) / 1000);
  // How much of the coin flip, the turn, or the pause is left, for the clock under the heading.
  const clock = seconds === null ? null : (seconds * 1000) / windowLength(`${state.turnNumber}:${state.phase}`, state.remainingMs);
  const heading = state.winner ? `${teamNames[state.winner]} wins!`
    : state.phase === 'flip' ? 'Coin flip'
    : state.phase === 'pause' ? `${teamNames[otherTeam(state.turn)]} is up next`
    : `${teamNames[state.turn]}, tap!`;
  // The team the heading is about: the winner, the flip's winner, or whoever taps next.
  const headingTeam = state.winner ?? (state.phase === 'pause' ? otherTeam(state.turn) : state.turn);
  const last = state.lastTurn;

  // The team that just attacked swings, during the pause and on the final blow, and otherwise the winner celebrates.
  function animationFor(team: TeamId): KnightAnimation {
    const swung = last?.team === team && last.taps.attack > 0;
    if (state.winner === team) return swung ? 'attack' : 'victory';
    if (state.phase === 'pause' && swung) return 'attack';
    return 'idle';
  }

  function teamScore(team: TeamId) {
    const knight = state.knights[team];
    // The items picked in the boss fights carry into PvP, so the knight's bonuses show under its HP.
    const bonus = bonusText(knight.buffs);
    return (
      <section className={`pvp-team team-${team}`} aria-labelledby={`${team}-score`}>
        <h2 className="pvp-team-name" id={`${team}-score`}>{teamNames[team]}</h2>
        <div className="pvp-hp" role="progressbar" aria-label={`${teamNames[team]}'s knight's health`}
          aria-valuenow={knight.hp} aria-valuemin={0} aria-valuemax={knight.maxHp}>
          <div style={{ width: `${(100 * knight.hp) / knight.maxHp}%`, '--hp': knight.hp / knight.maxHp } as CSSProperties} />
        </div>
        <p className="pvp-hp-row">
          <span className="stage-plate-value">{formatHp(knight.hp)} / {knight.maxHp} HP</span>
          {Math.round(knight.shield) > 0 && <span className="pvp-shield">Shield {formatAmount(knight.shield)}</span>}
        </p>
        {bonus && <p className="pvp-bonus">{bonus}</p>}
      </section>
    );
  }

  // The big line across the arena, which the room watches: who goes first, the team that taps now,
  // the seconds until the next team's turn, or the final blow.
  const moment = state.winner ? 'K.O.!'
    : state.phase === 'flip' ? `${teamNames[state.turn]} goes first!`
    // During a turn the heading over the clock already says who taps, so the arena leaves the knights alone.
    : state.phase === 'pause' && seconds !== null ? String(Math.max(1, Math.ceil(seconds)))
    : null;

  return (
    <HostFrame dark action={<EndButton label="End game" confirmLabel="End for everyone?" onConfirm={onEndGame} />}>
      <main className="stage-pvp">
        <div className="pvp-board">
          {teamScore('red')}
          <div className={`pvp-center team-${headingTeam}`}>
            <h1 className="pvp-heading" id="pvp-heading">{heading}</h1>
            <Clock fraction={clock} />
            {state.phase === 'turn'
              ? <TapCounts label="Taps this turn" taps={state.taps} tone={state.turn} />
              : <p className="pvp-turn">Turn {state.turnNumber}</p>}
          </div>
          {teamScore('blue')}
        </div>

        <section className={`stage-arena team-${headingTeam}`} aria-label="PvP arena">
          {moment && <p className="stage-moment" key={moment}>{moment}</p>}
          <div className="stage-floor">
            {teams.map(team => {
              // On the final blow, the losing knight falls backward where it stood.
              const knockedOut = state.winner !== null && state.winner !== team;
              return (
                <div key={team} className={`stage-fighter ${knockedOut ? 'is-knocked-out' : ''}`}
                  style={knockedOut ? ({ '--mirror': team === 'blue' ? -1 : 1 } as CSSProperties) : undefined}>
                  <Knight animation={animationFor(team)} mirrored={team === 'blue'}
                    label={`${teamNames[team]}'s knight`} size="var(--sprite)" />
                  <div className="stage-plate" />
                </div>
              );
            })}
          </div>
        </section>

        {/* The coin flip's big line says who goes first, so the strip stays away until the first turn. */}
        {state.phase !== 'flip' && (
          <footer className="stage-foot" role="status">
            {state.phase !== 'turn' && last && <p>{describeTurn(last)}</p>}
          </footer>
        )}
      </main>
    </HostFrame>
  );
}
