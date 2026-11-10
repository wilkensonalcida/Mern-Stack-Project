import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import EnemyFight from '../game/EnemyFight';
import TeamFight from '../game/TeamFight';
import PageLayout from '../components/PageLayout';
import { socket } from '../socket/socket';
import type { Lobby } from '../socket/lobby';
import type { GameResult, PvpReady } from '../game/enemyTypes';

type GamePhase = 'enemy' | 'pvp' | 'results';

export default function PlayPage() {
  const { code = '' } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [lobby, setLobby] = useState<Lobby | null>(null);
  const [gamePhase, setGamePhase] = useState<GamePhase>('enemy');
  const [pvpData, setPvpData] = useState<PvpReady | null>(null);
  const [result, setResult] = useState<GameResult | null>(null);
  const [error, setError] = useState('');

  const onPvpReady = useCallback((data: PvpReady) => {
    if (data.code !== code.toUpperCase()) return;
    setPvpData(data);
    setGamePhase('pvp');
  }, [code]);

  useEffect(() => {
    if (!code) return;
    let mounted = true;
    const normalizedCode = code.toUpperCase();

    const onFinished = (data: GameResult) => {
      if (!mounted || data.code !== normalizedCode) return;
      setResult(data);
      setGamePhase('results');
    };

    const load = () => {
      socket.timeout(5000).emit('game:get', normalizedCode,
        (err: Error | null, reply: { success: boolean; lobby?: Lobby; error?: string }) => {
          if (!mounted) return;
          if (err || !reply?.success || !reply.lobby) {
            setError(reply?.error || 'Unable to load game.');
          } else {
            setLobby(reply.lobby);
            setError('');
          }
        });
      socket.timeout(5000).emit('game:result:get', normalizedCode,
        (err: Error | null, reply: { success: boolean; result?: GameResult }) => {
          if (mounted && !err && reply?.success && reply.result) onFinished(reply.result);
        });
    };

    socket.on('game:finished', onFinished);
    socket.on('connect', load);
    if (socket.connected) load();
    else socket.connect();
    return () => {
      mounted = false;
      socket.off('game:finished', onFinished);
      socket.off('connect', load);
    };
  }, [code]);

  if (!code) return <PageLayout><p>Invalid game code.</p></PageLayout>;
  if (error) return <PageLayout><p className="text-danger" role="alert">{error}</p></PageLayout>;

  if (gamePhase === 'enemy') {
    return <EnemyFight code={code} onPvpReady={onPvpReady} />;
  }
  if (gamePhase === 'pvp') {
    if (!lobby || !pvpData) return <PageLayout><p>Loading PvP data…</p></PageLayout>;
    // TeamFight still runs locally until PvP Socket.IO integration is completed.
    return <TeamFight lobby={lobby} pvpData={pvpData} onEndGame={() => setGamePhase('results')} />;
  }

  const host = !!lobby && socket.id === lobby.hostId;
  return (
    <PageLayout>
      <section className="card"><div className="card-body p-4 text-center">
        <h1>Game Results</h1>
        {result ? <>
          <h2>{result.winner.toUpperCase()} team wins!</h2>
          <p>The {result.loser} team was defeated during the enemy fight.</p>
        </> : <p>PvP results are not implemented yet.</p>}
        <div className="d-flex justify-content-center gap-2">
          {host && <button className="btn btn-dark" type="button" onClick={() => navigate('/dashboard')}>Dashboard</button>}
          <button className="btn btn-outline-dark" type="button" onClick={() => navigate('/login')}>Exit game</button>
        </div>
      </div></section>
    </PageLayout>
  );
}
