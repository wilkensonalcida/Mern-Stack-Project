import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import Controller from '../game/Controller';
import '../game/Controller.css';
import PageLayout from '../components/PageLayout';
import { socket } from '../socket/socket';
import type { Lobby } from '../socket/lobby';
import type { GameResult } from '../game/enemyTypes';

type LobbyAck = { success: boolean; lobby?: Lobby; error?: string };
type ResultAck = { success: boolean; result?: GameResult; error?: string };

// A guest's phone after Start game: the controller, then the result. The host's screen shows the fight.
export default function PlayPage() {
  const { code = '' } = useParams<{ code: string }>();
  const normalizedCode = code.trim().toUpperCase();
  const navigate = useNavigate();
  const [lobby, setLobby] = useState<Lobby | null>(null);
  const [result, setResult] = useState<GameResult | null>(null);
  const [cancelled, setCancelled] = useState(false);
  const [error, setError] = useState('');
  const [currentSocketId, setCurrentSocketId] = useState<string | null>(socket.id ?? null);

  const onFinished = useCallback((data: GameResult) => {
    if (data.code !== normalizedCode) return;
    setResult(data);
  }, [normalizedCode]);

  function leaveGame(destination: string) {
      socket.timeout(5000).emit(
        "game:leave",
        (
          err: Error | null,
          response: { success: boolean; error?: string }
        ) => {
          if (err || !response?.success) {
            setError(response?.error || "Unable to leave game.");
            return;
          }

          navigate(destination);
        }
      );
    }

  useEffect(() => {
    if (!normalizedCode) return;
    let mounted = true;
    function load() {
      setCurrentSocketId(socket.id ?? null);
      socket.timeout(5000).emit('game:get', normalizedCode,
        (err: Error | null, reply: LobbyAck) => {
          if (!mounted) return;
          if (err || !reply?.success || !reply.lobby) {
            setError(reply?.error || 'Unable to load game lobby.');
          } else {
            setLobby(reply.lobby);
            setError('');
          }
        });
      for (const event of ['game:result:get', 'game:pvp:result:get']) {
        socket.timeout(5000).emit(event, normalizedCode,
          (err: Error | null, reply: ResultAck) => {
            if (mounted && !err && reply?.success && reply.result) onFinished(reply.result);
          });
      }
    }
    // The host ended the game, so the lobby is gone.
    const onCancelled = () => {
      if (mounted) setCancelled(true);
    };

    socket.on('game:finished', onFinished);
    socket.on('game:cancelled', onCancelled);
    socket.on('connect', load);
    if (socket.connected) load();
    else socket.connect();
    return () => {
      mounted = false;
      socket.off('game:finished', onFinished);
      socket.off('game:cancelled', onCancelled);
      socket.off('connect', load);
    };
  }, [normalizedCode, onFinished]);

  if (!normalizedCode) return <PageLayout><p>Invalid game code.</p></PageLayout>;
  if (cancelled && !result) {
    return (
      <PageLayout>
        <section className="card"><div className="card-body p-4 text-center">
          <h1 className="h3">The host ended the game</h1>
          <Link className="btn btn-dark mt-2" to="/join">Join another game</Link>
        </div></section>
      </PageLayout>
    );
  }
  if (result) {
    // The phone keeps its team's color, names the winner, and offers another game.
    const myTeam = lobby?.players.find(player => player.id === currentSocketId)?.team ?? null;
    const myTaps = myTeam && result.totals
      ? result.totals[myTeam].attack + result.totals[myTeam].block + result.totals[myTeam].heal
      : null;
    return (
      <div className={`controller-page team-${myTeam ?? result.winner}`}>
        <main className="controller justify-content-center text-center">
          <h1 className="display-5 fw-bold">{result.winner === 'red' ? 'Red' : 'Blue'} team wins!</h1>
          {myTeam && <p className="fs-3 fw-semibold">{myTeam === result.winner ? 'Your team won!' : 'Your team lost. Good fight!'}</p>}
          {myTaps !== null && <p className="fs-5">Your team tapped {myTaps} times.</p>}
          {error && <p role="alert" className="text-danger fw-semibold">{error}</p>}
          <button className="btn btn-dark btn-lg" type="button" onClick={() => leaveGame('/join')}>Join another game</button>
        </main>
      </div>
    );
  }
  if (error && !lobby) return <PageLayout><p role="alert" className="text-danger">{error}</p></PageLayout>;
  if (!lobby) return <PageLayout><p role="status">Loading the game…</p></PageLayout>;

  // A phone whose connection dropped comes back as a new connection, which the game doesn't know.
  const me = lobby.players.find(player => player.id === currentSocketId);
  if (!me?.team) {
    return (
      <PageLayout>
        <section className="card"><div className="card-body p-4 text-center">
          <h1 className="h3">You're not in this game</h1>
          <p>A phone that loses its connection can't rejoin a game that has started.</p>
          <Link className="btn btn-dark" to="/join">Join a game</Link>
        </div></section>
      </PageLayout>
    );
  }
  return <Controller code={normalizedCode} team={me.team} nickname={me.name} />;
}
