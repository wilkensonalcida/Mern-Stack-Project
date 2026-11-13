import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import Controller from '../game/Controller';
import Knight from '../game/Knight';
import '../game/Controller.css';
import PhoneMessage from '../components/PhoneMessage';
import { socket } from '../socket/socket';
import type { Lobby } from '../socket/lobby';
import type { GameResult, TeamId } from '../game/enemyTypes';

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

  const joinLink = (label: string) => <Link className="phone-button" to="/join">{label}</Link>;
  if (!normalizedCode) return <PhoneMessage title="Invalid game code" action={joinLink('Join a game')} />;
  if (cancelled && !result) {
    return <PhoneMessage title="The host ended the game" action={joinLink('Join another game')} />;
  }
  if (result) {
    // The phone fills with its team's color, with its knight in a spotlight and one verdict.
    const mine = lobby?.players.find(player => player.id === currentSocketId);
    const myTeam = mine?.team ?? null;
    const myTaps = myTeam && result.totals
      ? result.totals[myTeam].attack + result.totals[myTeam].block + result.totals[myTeam].heal
      : null;
    const teamName = (team: TeamId) => (team === 'red' ? 'Red team' : 'Blue team');
    const won = myTeam === result.winner;
    const verdict = myTeam === null ? `${teamName(result.winner)} wins!` : won ? 'Your team won!' : 'Your team lost. Good fight!';
    const shown = myTeam ?? result.winner;
    return (
      <div className={`controller-page team-${shown} is-result`}>
        <main className="controller result-screen">
          <p className="result-who">{mine && myTeam ? `${mine.name}, ${teamName(myTeam)}` : 'Fight Me Bro'}</p>
          <div className="result-spot">
            <Knight animation={myTeam === null || won ? 'victory' : 'idle'} mirrored={shown === 'blue'}
              label={`${teamName(shown)}'s knight`} size="82%" />
          </div>
          <h1 className="result-verdict">{verdict}</h1>
          {myTaps !== null && <p className="result-taps">Your team tapped <strong>{myTaps}</strong> times.</p>}
          {error && <p className="controller-error" role="alert">{error}</p>}
          <div className="phone-actions">
            <button className="phone-button is-light" type="button" onClick={() => leaveGame('/join')}>Join another game</button>
          </div>
        </main>
      </div>
    );
  }
  if (error && !lobby) return <PhoneMessage title={error} live="alert" action={joinLink('Join a game')} />;
  if (!lobby) return <PhoneMessage title="Loading the game…" live="status" />;

  // A phone whose connection dropped comes back as a new connection, which the game doesn't know.
  const me = lobby.players.find(player => player.id === currentSocketId);
  if (!me?.team) {
    return (
      <PhoneMessage title="You're not in this game" action={joinLink('Join a game')}>
        A phone that loses its connection can't rejoin a game that has started.
      </PhoneMessage>
    );
  }
  return <Controller code={normalizedCode} team={me.team} nickname={me.name} />;
}
