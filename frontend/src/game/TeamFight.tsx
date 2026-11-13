import { useEffect, useState } from 'react';
import { socket } from '../socket/socket';
import type { TeamId } from './enemyTypes';
import type { PvpState, PvpStateAck } from './pvpTypes';
import Knight, { type KnightAnimation } from './Knight';
import { describeTurn } from './pvpText';
import { HostFrame, HostMessage, TapCounts } from './HostFrame';

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
  const seconds = state.endsAt === null ? null : Math.max(0, (state.remainingMs - (now - pvp.at)) / 1000);
  const heading = state.winner ? `${teamNames[state.winner]} wins!`
    : state.phase === 'flip' ? `${teamNames[state.turn]} won the coin flip`
    : state.phase === 'pause' ? `${teamNames[otherTeam(state.turn)]} is up next`
    : `${teamNames[state.turn]}'s turn`;
  // The heading takes the color of the team it's about: the winner, the flip's winner, or whoever taps next.
  const headingTeam = state.winner ?? (state.phase === 'pause' ? otherTeam(state.turn) : state.turn);
  const last = state.lastTurn;

  // The team that just attacked swings during the pause, and the winner celebrates.
  function animationFor(team: TeamId): KnightAnimation {
    if (state.winner === team) return 'victory';
    if (state.phase === 'pause' && last?.team === team && last.taps.attack > 0) return 'attack';
    return 'idle';
  }

  function teamScore(team: TeamId) {
    const knight = state.knights[team];
    return (
      <section className={`host-card team-${team}`} aria-labelledby={`${team}-score`}>
        <header className="host-card-head">
          <h2 id={`${team}-score`}>{teamNames[team]}</h2>
          <p className="host-players">{state.players[team].join(', ')}</p>
        </header>
        <div className="host-score-body">
          <div className="host-hp-track" role="progressbar" aria-label={`${teamNames[team]}'s knight's health`}
            aria-valuenow={knight.hp} aria-valuemin={0} aria-valuemax={knight.maxHp}>
            <div style={{ width: `${(100 * knight.hp) / knight.maxHp}%` }} />
          </div>
          <p className="host-score-hp">
            <span className="host-hp-value">{knight.hp.toFixed(1)} / {knight.maxHp} HP</span>
            {knight.shield > 0 && <span className="host-shield">Shield {knight.shield.toFixed(1)}</span>}
          </p>
        </div>
      </section>
    );
  }

  return (
    <HostFrame action={<button className="host-bar-button" type="button" onClick={onEndGame}>End game</button>}>
      <main className="host-pvp">
        <div className="host-scoreboard">
          {teamScore('red')}
          <div className={`host-score-center team-${headingTeam}`}>
            <h1 className="host-pvp-heading" id="pvp-heading">{heading}</h1>
            {seconds !== null && <p className="host-timer" role="timer">{seconds.toFixed(1)} s</p>}
            <p className="host-muted mb-0">Turn {state.turnNumber}</p>
          </div>
          {teamScore('blue')}
        </div>

        <section className="host-pvp-arena" aria-label="PvP arena">
          {teams.map(team => (state.winner && state.winner !== team
            // The losing knight is gone, and its spot stays empty so the winner doesn't move.
            ? <div key={team} className="host-fighter-spot" />
            : <Knight key={team} animation={animationFor(team)} mirrored={team === 'blue'}
                label={`${teamNames[team]}'s knight`} size="var(--sprite)" />))}
        </section>

        <div className="host-pvp-line" role="status">
          {state.phase === 'turn'
            ? <TapCounts label="Taps this turn" taps={state.taps} tone={state.turn} />
            : state.phase === 'flip'
              ? <p>{teamNames[state.turn]} taps first.</p>
              : last && <p>{describeTurn(last)}</p>}
        </div>
      </main>
    </HostFrame>
  );
}
