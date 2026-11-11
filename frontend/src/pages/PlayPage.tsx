import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import EnemyFight from '../game/EnemyFight';
import TeamFight from '../game/TeamFight';
import PageLayout from '../components/PageLayout';
import { socket } from '../socket/socket';
import type { Lobby } from '../socket/lobby';
import type { GameResult, PvpReady } from '../game/enemyTypes';

type GamePhase = 'enemy' | 'pvp' | 'results';
type LobbyAck = { success: boolean; lobby?: Lobby; error?: string };
type ResultAck = { success: boolean; result?: GameResult; error?: string };

export default function PlayPage() {
  const { code = '' } = useParams<{ code: string }>();
  const normalizedCode = code.trim().toUpperCase();
  const navigate = useNavigate();
  const [lobby, setLobby] = useState<Lobby | null>(null);
  const [gamePhase, setGamePhase] = useState<GamePhase>('enemy');
  const [pvpData, setPvpData] = useState<PvpReady | null>(null);
  const [result, setResult] = useState<GameResult | null>(null);
  const [error, setError] = useState('');
  const [currentSocketId, setCurrentSocketId] = useState<string | null>(socket.id ?? null);

  const onPvpReady = useCallback((data: PvpReady) => {
    if (data.code !== normalizedCode) return;
    setPvpData(data);
    setGamePhase('pvp');
  }, [normalizedCode]);
  const onFinished = useCallback((data: GameResult) => {
    if (data.code !== normalizedCode) return;
    setResult(data);
    setGamePhase('results');
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
    
    socket.on('game:finished', onFinished);
    socket.on('connect', load);
    if (socket.connected) load();
    else socket.connect();
    return () => {
      mounted = false;
      socket.off('game:finished', onFinished);
      socket.off('connect', load);
    };
  }, [normalizedCode, onFinished]);

  if (!normalizedCode) return <PageLayout><p>Invalid game code.</p></PageLayout>;
  if (error && !lobby) return <PageLayout><p role="alert" className="text-danger">{error}</p></PageLayout>;
  if (gamePhase === 'enemy') {
    return <EnemyFight code={normalizedCode} onPvpReady={onPvpReady} onGameFinished={onFinished} />;
  }
  if (gamePhase === 'pvp') {
    if (!lobby || !pvpData) return <PageLayout><p>Loading PvP data…</p></PageLayout>;
    return <TeamFight lobby={lobby} pvpData={pvpData}
      onGameFinished={onFinished} onEndGame={() => { /* results only after server victory */ }} />;
  }
  // Results screen placeholder
  const host = !!lobby && currentSocketId === lobby.hostId;
  return (
    <PageLayout>
      <section className="card"><div className="card-body p-4 text-center">
        <h1>Game Results</h1>
        {result ? <>
          <h2>{result.winner.toUpperCase()} team wins!</h2>
          <p>{result.reason === 'pvp-defeat' ? 'Victory in PvP combat.' : 'Victory during enemy combat.'}</p>
        </> : <p>Waiting for the server's final result…</p>}
        <div className="d-flex justify-content-center gap-2">
          {host && <button className="btn btn-dark" type="button" onClick={() => leaveGame('/')}>Dashboard</button>}
          <button className="btn btn-outline-dark" type="button" onClick={() => leaveGame('/login')}>Exit game</button>
        </div>
      </div></section>
    </PageLayout>
  );
}
