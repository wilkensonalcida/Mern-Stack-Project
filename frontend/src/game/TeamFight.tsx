import { useEffect, useState } from 'react';
import PageLayout from '../components/PageLayout';
import { socket } from '../socket/socket';
import type { Lobby } from '../socket/lobby';
import type { GameResult, Move, PvpReady, TeamId } from './enemyTypes';
import type { PvpState, PvpStateAck, PvpResultAck, PvpTapAck } from './pvpTypes';
import Knight, { type KnightAnimation } from './Knight';

const teamNames: Record<TeamId, string> = { red: 'Red team', blue: 'Blue team' };
const moves: Move[] = ['attack', 'block', 'heal'];

type TeamFightProps = {
  lobby: Lobby; // retained to preserve the existing PlayPage API
  pvpData: PvpReady; // obtained from EnemyFight; server still owns real PvP state
  onEndGame: () => void; // legacy callback; not called until a server-confirmed result
  onGameFinished?: (result: GameResult) => void;
};
// Both host and guests render the same server-owned PvP state.
export default function TeamFight({ pvpData, onGameFinished }: TeamFightProps) {
  const code = pvpData.code.trim().toUpperCase();
  const [state, setState] = useState<PvpState | null>(null);
  const [connected, setConnected] = useState(socket.connected);
  const [socketId, setSocketId] = useState<string | null>(socket.id ?? null);
  const [deadline, setDeadline] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    const onState = (next: PvpState) => {
      if (!mounted || next.code !== code) return;
      setState(next);
      setDeadline(next.endsAt !== null ? Date.now() + next.remainingMs : null);
    };
    const onResult = (result: GameResult) => {
      if (mounted && result.code === code && result.reason === 'pvp-defeat') {
        onGameFinished?.(result);
      }
    };
    // Load the current PvP state from the server, and if finished, also load the result.
    const load = () => {
      socket.timeout(5000).emit('game:pvp:state:get', code,
        (err: Error | null, reply: PvpStateAck) => {
          if (!mounted) return;
          if (err || !reply?.success || !reply.state) {
            setError(reply?.error || 'Unable to load PvP.');
            return;
          }
          setError('');
          onState(reply.state);
          if (reply.state.phase === 'finished') {
            socket.timeout(5000).emit('game:pvp:result:get', code,
              (resultError: Error | null, resultReply: PvpResultAck) => {
                if (mounted && !resultError && resultReply?.success && resultReply.result) {
                  onResult(resultReply.result);
                }
              });
          }
        });
    };
    // Connect and disconnect handlers to manage socket state and load PvP state.
    const connect = () => {
      setConnected(true);
      setSocketId(socket.id ?? null);
      load();
    };
    const disconnect = () => {
      setConnected(false);
      setSocketId(null);
      setDeadline(null);
    };
    socket.on('game:pvp:state', onState);
    socket.on('game:finished', onResult);
    socket.on('connect', connect);
    socket.on('disconnect', disconnect);
    if (socket.connected) connect();
    else socket.connect();
    return () => {
      mounted = false;
      socket.off('game:pvp:state', onState);
      socket.off('game:finished', onResult);
      socket.off('connect', connect);
      socket.off('disconnect', disconnect);
    };
  }, [code, onGameFinished]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 100);
    return () => window.clearInterval(id);
  }, []);

  if (!connected) return <PageLayout><p role="status">Connection lost. Reconnecting…</p></PageLayout>;
  if (error && !state) return <PageLayout><p className="text-danger" role="alert">{error}</p></PageLayout>;
  if (!state) return <PageLayout><p role="status">Loading synchronized PvP…</p></PageLayout>;

  const player = state.players.find(p => p.id === socketId);
  if (!player) return <PageLayout><p role="alert">This socket is not registered in the PvP roster. Rejoin the game session.</p></PageLayout>;

  const active = state.phase === 'turn' && state.endsAt !== null &&
    state.turn === player.team && player.hp > 0;
  const seconds = deadline === null ? '0.0' : Math.max(0, (deadline - now) / 1000).toFixed(1);
  const dead = player.hp <= 0;
  const winner = state.winner;
  // Function to send a tap action to the server if it's the player's turn and they are alive.
  function tap(move: Move) {
    if (!active) return;
    socket.timeout(3000).emit('game:pvp:tap', move, (err: Error | null, reply: PvpTapAck) => {
      if (err) { setError('Tap did not reach the server.'); return; }
      if (!reply?.success && reply?.error !== 'Not accepting taps.') {
        setError(reply?.error || 'Tap rejected.');
      }
    });
  }

  let heading = `${teamNames[state.turn]}'s turn`;
  if (winner) heading = `${teamNames[winner]} wins!`;
  else if (state.phase === 'flip') heading = `${teamNames[state.turn]} won the coin flip`;
  else if (state.phase === 'pause') heading = `${teamNames[state.turn === 'red' ? 'blue' : 'red']} plays next`;

  function animationFor(team: TeamId): KnightAnimation {
    if (winner === team) return 'victory';
    if (state?.phase === 'pause' && state.lastTurn?.team === team && state.lastTurn.totalAttack > 0) return 'attack';
    return 'idle';
  }

  function renderTeam(team: TeamId) {
    const roster = state!.players.filter(p => p.team === team);
    const living = roster.filter(p => p.hp > 0);
    const hp = roster.reduce((sum, p) => sum + p.hp, 0);
    const maxHp = roster.reduce((sum, p) => sum + p.maxHp, 0);
    return (
      <>
        <h2 className="h5 mb-2">{teamNames[team]} ({living.length}/{roster.length} alive)</h2>
        <div className="progress" role="progressbar" aria-label={`${teamNames[team]} total HP`}
          aria-valuemin={0} aria-valuemax={maxHp} aria-valuenow={hp} style={{ height: 20 }}>
          <div className={`progress-bar ${team === 'red' ? 'bg-danger' : 'bg-primary'}`}
            style={{ width: `${maxHp ? 100 * hp / maxHp : 0}%` }} />
        </div>
        <p className="fw-semibold mt-1">{hp.toFixed(1)} / {maxHp} total HP</p>
        <div className="small text-body-secondary">
          {roster.map(p => (
            <p className="mb-1" key={p.id}>
              {p.name}: {p.hp.toFixed(1)} HP
              {p.hp <= 0 ? ' (defeated)' : p.shield > 0 ? ` · Shield ${p.shield.toFixed(1)}` : ''}
            </p>
          ))}
        </div>
      </>
    );
  }
  const last = state.lastTurn;
  return (
    <PageLayout wide>
      <div className="d-flex flex-column" style={{ minHeight: 'calc(100vh - 3rem)', paddingBottom: 95 }}>
        <section className="card" aria-labelledby="pvp-heading">
          <div className="card-body py-4">
            <div className="row align-items-start row-gap-3">
              <div className="col-md-4 order-2 order-md-1 text-center text-md-start">{renderTeam('red')}</div>
              <div className="col-md-4 order-1 order-md-2 text-center">
                <h1 className="fs-4 fw-bold mb-1" id="pvp-heading">{heading}</h1>
                {state.phase !== 'finished' && <p className="display-6 mb-0" role="timer">{seconds} s</p>}
                <span className="text-body-secondary">Turn {state.turnNumber}</span>
              </div>
              <div className="col-md-4 order-3 text-center text-md-end">{renderTeam('blue')}</div>
            </div>
          </div>
        </section>
        <p className="text-center fs-5 mt-3" role="status" style={{ minHeight: '1.5em' }}>
          {dead && !winner ? 'You have been defeated. Spectating your teammates.' :
           state.phase === 'flip' ? 'Preparing the battle…' :
           state.phase === 'turn' && !active ? `Waiting for ${teamNames[state.turn]} to finish their turn.` :
           state.phase === 'turn' ? 'Attack, Block, or Heal! All living teammates can tap.' :
           state.phase === 'pause' && last ? describeTurn(last) :
           winner ? `${teamNames[winner]} is victorious!` : 'Preparing the next turn…'}
        </p>
        {error && <p className="text-danger text-center" role="alert">{error}</p>}
        <section className="flex-grow-1 d-flex justify-content-around align-items-center py-4" aria-label="PvP arena">
          {(['red', 'blue'] as TeamId[]).map(team => {
            const anyAlive = state.players.some(p => p.team === team && p.hp > 0);
            return anyAlive ? (
              <Knight key={team} animation={animationFor(team)} mirrored={team === 'blue'} label={`${teamNames[team]}'s knight`} />
            ) : <div key={team} style={{ width: 'min(250px, 40vw)', aspectRatio: '1/1' }} />;
          })}
        </section>
        <p className="text-center small text-body-secondary">
          Your buffs: Attack ×{player.buffs.attack.toFixed(2)}, Block ×{player.buffs.block.toFixed(2)}, Heal ×{player.buffs.heal.toFixed(2)}
        </p>
        {dead && <p className="text-center fw-semibold">You can spectate but cannot tap or be healed back to life.</p>}
      </div>
      <div className="position-fixed bottom-0 start-0 end-0 p-3 bg-body border-top d-flex justify-content-center gap-2">
        {moves.map(move => <button key={move} className="btn btn-dark" type="button"
          disabled={!active} onClick={() => tap(move)}>
          {move[0].toUpperCase() + move.slice(1)}
        </button>)}
      </div>
    </PageLayout>
  );
}

function describeTurn(last: PvpState['lastTurn']): string {
  if (!last) return '';
  const team = teamNames[last.team];
  const enemy = teamNames[last.team === 'red' ? 'blue' : 'red'];
  return `${team} dealt ${last.damagePerTarget.toFixed(1)} damage to each living ${enemy} fighter before shields, ` +
    `blocked ${last.blocked.toFixed(1)}, healed ${last.healed.toFixed(1)} and lost ${last.casualties.length} opponents.`;
}


