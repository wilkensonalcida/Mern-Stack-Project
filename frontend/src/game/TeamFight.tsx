import { useEffect, useState } from 'react';
import PageLayout from '../components/PageLayout';
import { socket } from '../socket/socket';
import type { TeamId } from './enemyTypes';
import type { PvpState, PvpStateAck } from './pvpTypes';
import Knight, { type KnightAnimation } from './Knight';
import { describeTurn } from './pvpText';

const teamNames: Record<TeamId, string> = { red: 'Red team', blue: 'Blue team' };
const teamText: Record<TeamId, string> = { red: 'text-danger', blue: 'text-primary' };
const teamBar: Record<TeamId, string> = { red: 'bg-danger', blue: 'bg-primary' };
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

  if (!pvp) return <PageLayout><p role="status">{error || 'Loading PvP…'}</p></PageLayout>;
  const { state } = pvp;
  const seconds = state.endsAt === null ? null : Math.max(0, (state.remainingMs - (now - pvp.at)) / 1000);
  const heading = state.winner ? `${teamNames[state.winner]} wins!`
    : state.phase === 'flip' ? `${teamNames[state.turn]} won the coin flip`
    : state.phase === 'pause' ? `${teamNames[otherTeam(state.turn)]} is up next`
    : `${teamNames[state.turn]}'s turn`;
  const totalTaps = state.taps.attack + state.taps.block + state.taps.heal;
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
      <>
        <h2 className={`h3 mb-0 ${teamText[team]}`}>{teamNames[team]}</h2>
        <p className="text-body-secondary mb-2 text-truncate">{state.players[team].join(', ')}</p>
        <div className="progress" role="progressbar" aria-label={`${teamNames[team]}'s knight's health`}
          aria-valuenow={knight.hp} aria-valuemin={0} aria-valuemax={knight.maxHp} style={{ height: 20 }}>
          <div className={`progress-bar ${teamBar[team]}`} style={{ width: `${(100 * knight.hp) / knight.maxHp}%` }} />
        </div>
        <p className="fs-5 fw-semibold mt-1 mb-0">{knight.hp.toFixed(1)} / {knight.maxHp} HP</p>
        <p className="mb-0" style={{ minHeight: '1.5em' }}>{knight.shield > 0 ? `Shield ${knight.shield.toFixed(1)}` : ''}</p>
      </>
    );
  }

  return (
    <main className="container-fluid px-4 pt-4" style={{ paddingBottom: 88 }}>
      <section className="card" aria-labelledby="pvp-heading">
        <div className="card-body p-4">
          <div className="row align-items-start row-gap-3">
            <div className="col-md-4 order-2 order-md-1 text-center text-md-start">{teamScore('red')}</div>
            <div className="col-md-4 order-1 order-md-2 text-center">
              <h1 className="h2 fw-bold mb-1" id="pvp-heading">{heading}</h1>
              {seconds !== null && <p className="display-5 mb-0" role="timer">{seconds.toFixed(1)} s</p>}
              <p className="text-body-secondary mb-0">Turn {state.turnNumber}</p>
            </div>
            <div className="col-md-4 order-3 text-center text-md-end">{teamScore('blue')}</div>
          </div>
        </div>
      </section>

      <section className="d-flex justify-content-around align-items-center py-4" aria-label="PvP arena">
        {teams.map(team => (state.winner && state.winner !== team
          // The losing knight is gone, and its spot stays empty so the winner doesn't move.
          ? <div key={team} style={{ width: 'min(250px, 40vw)', aspectRatio: '1 / 1' }} />
          : <Knight key={team} animation={animationFor(team)} mirrored={team === 'blue'} label={`${teamNames[team]}'s knight`} />))}
      </section>

      <div className="text-center" role="status">
        {state.phase === 'turn' ? <>
          <p className={`fs-2 fw-semibold mb-0 ${teamText[state.turn]}`}>Taps this turn: {totalTaps}</p>
          <p className="text-body-secondary mb-0">Attack {state.taps.attack} · Block {state.taps.block} · Heal {state.taps.heal}</p>
        </> : state.phase === 'flip'
          ? <p className="fs-4 mb-0">{teamNames[state.turn]} taps first.</p>
          : last && <p className="fs-4 mb-0">{describeTurn(last)}</p>}
      </div>

      <div className="position-fixed bottom-0 start-0 end-0 p-3 bg-body">
        <button className="btn btn-outline-dark" type="button" onClick={onEndGame}>End game</button>
      </div>
    </main>
  );
}
