import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { socket } from '../socket/socket'
import { QRCodeSVG } from 'qrcode.react'
import { HostBossFights } from '../game/EnemyFight'
import TeamFight from '../game/TeamFight'
import HostResults from '../game/HostResults'
import { HostFrame, HostMessage } from '../game/HostFrame'
import type { GameResult, HostBossState } from '../game/enemyTypes'

import type {
  Lobby,
  LobbyPlayer,
  LobbyResponse,
  TeamId,
} from '../socket/lobby'


export default function HostPage() {
  const { code } = useParams<{ code: string }>()
  const navigate = useNavigate()

  const[lobby, setLobby] = useState<Lobby | null>(null)
  const [error, setError] = useState("");
  const [starting, setStarting] = useState(false)
  const [result, setResult] = useState<GameResult | null>(null)
  const [boss, setBoss] = useState<{ state: HostBossState, receivedAt: number } | null>(null)
  const [pvpStarted, setPvpStarted] = useState(false)

  useEffect(() => {
    if (!code) return;

    function onUpdate(updatedLobby: Lobby) {
      if(updatedLobby.code === code) {
        setLobby(updatedLobby)
      }
    }

    // Both teams' boss fights, sent each time either changes, and about five times a second while players tap.
    function onBossState(state: HostBossState) {
      if (state.code === code) {
        setBoss({ state, receivedAt: Date.now() })
        if (state.pvpStarted) setPvpStarted(true)
      }
    }

    function loadBossState() {
      socket.timeout(5000).emit(
        "game:enemy:host:get",
        code,
        (err: Error | null, response: { success: boolean, state?: HostBossState }) => {
          if (!err && response?.success && response.state) onBossState(response.state)
        }
      )
    }

    // The host doesn't play, so it stays on this page, which swaps the lobby for the game.
    function onStarted(updatedLobby: Lobby) {
      if (updatedLobby.code === code) {
        setLobby(updatedLobby)
        loadBossState()
      }
    }

    function onPvpReady(data: { code: string }) {
      if (data.code === code) setPvpStarted(true)
    }

    function onFinished(finished: GameResult) {
      if (finished.code === code) {
        setResult(finished)
      }
    }

    function onCancelled() {
      navigate('/')
    }

    socket.on("game:updated", onUpdate)
    socket.on("game:started", onStarted)
    socket.on("game:enemy:host", onBossState)
    socket.on("game:pvp-ready", onPvpReady)
    socket.on("game:finished", onFinished)
    socket.on("game:cancelled", onCancelled)
  
  socket.timeout(5000).emit(
      "game:get",
      code,
      (err: Error | null, response: LobbyResponse) => {
        if(err || !response?.success || !response.lobby) {
          setError(
            response?.error || "Unable to load lobby! :("
          )
          return
        }
        setLobby(response.lobby)
        if (response.lobby.status === "playing") loadBossState()
      }
  )

  return () => {
    socket.off("game:updated", onUpdate)
    socket.off("game:started", onStarted)
    socket.off("game:enemy:host", onBossState)
    socket.off("game:pvp-ready", onPvpReady)
    socket.off("game:finished", onFinished)
    socket.off("game:cancelled", onCancelled)
  }
  }, [code, navigate])

  function startGame() {
    if(!lobby || starting) return;

    setStarting(true)
    setError("")

    socket.timeout(5000).emit(
      "game:start",
      lobby.code,
      (err: Error | null, response: {
        success: boolean,
        error?: string
      }) => {
        setStarting(false)

        if(err || !response?.success) {
          setError(response?.error || "Unable to start game.")
        }
      }
    )
  }

  function cancelGame() {
    if (!lobby) return
    socket.emit("game:cancel", lobby.code)
    navigate('/')
  }

  // After the game, the host leaves without ending the lobby, so the players keep their results.
  function backToDashboard() {
    setError("")
    socket.timeout(5000).emit(
      "game:leave",
      (err: Error | null, response: { success: boolean, error?: string }) => {
        if (err || !response?.success) {
          setError(response?.error || "Unable to leave the game.")
          return
        }
        navigate('/')
      }
    )
  }

  if(error && !lobby) {
    return (
      <HostMessage
        title={error}
        live="alert"
        action={<button className="host-start" type="button" onClick={() => navigate('/')}>Back to dashboard</button>}
      />
    )
  }

  if(!lobby){
    return <HostMessage title="Loading the lobby…" live="status" />
  }

  // After Start game, the phones play, and this screen shows the game.
  if (lobby.status === "playing") {
    if (pvpStarted && !result) {
      return <TeamFight code={lobby.code} onEndGame={cancelGame} />
    }
    if (boss && !result) {
      return <HostBossFights state={boss.state} receivedAt={boss.receivedAt} onEndGame={cancelGame} />
    }
    if (result) {
      return <HostResults result={result} lobby={lobby} error={error} onNewGame={backToDashboard} />
    }
    return (
      <HostFrame action={<button className="host-bar-button" type="button" onClick={cancelGame}>End game</button>}>
        <main className="host-message" role="status">
          <h1>Loading the game…</h1>
          <p className="host-muted mb-0">Game code {lobby.code}</p>
        </main>
      </HostFrame>
    )
  }

  const playerCount = lobby.players.length

  const redPlayers = lobby.players.filter(
    p => p.team === "red"
  )
  const bluePlayers = lobby.players.filter(
    p => p.team === "blue"
  )
  const unassignedPlayers = lobby.players.filter(
    p => p.team === null
  )
  const isHost = lobby.hostId === socket.id

  const canStart = !starting &&  isHost && redPlayers.length > 0 && bluePlayers.length > 0 && unassignedPlayers.length === 0;
  
  function renderTeam(
    teamId: TeamId,
    name: string,
    players: LobbyPlayer[]
  ) {
    return (
      <section className={`host-card host-team team-${teamId}`} key={teamId} aria-labelledby={`${teamId}-team`}>
        <header className="host-card-head">
          <h2 id={`${teamId}-team`}>{name}</h2>
          <span className="host-team-count" aria-label={`${players.length} ${players.length === 1 ? 'player' : 'players'}`}>{players.length}</span>
        </header>
        {players.length > 0 ? (
          <ul className="host-chips">
            {players.map(player => <li className="host-chip" key={player.id}>{player.name}</li>)}
          </ul>
        ) : (
          <p className="host-empty">No players yet.</p>
        )}
      </section>
    )
  }

  return (
    <HostFrame action={<button className="host-bar-button" type="button" onClick={cancelGame} disabled={!isHost}>Cancel match</button>}>
      <main className="host-lobby">
        <section className="host-card host-join" aria-labelledby="code-heading">
          {/* Where to join sits at the left and the QR code at the right, so the code stays in the middle. */}
          <div>
            <p className="host-join-label">Join at</p>
            <p className="host-join-url">{window.location.host}/join</p>
          </div>
          <div className="host-join-code">
            <h1 className="host-join-label" id="code-heading">Game code</h1>
            <p className="host-code">{lobby.code}</p>
          </div>
          <div className="host-qr">
            {/* Opens the join page on a phone at the nickname step, on whatever address the host is using. */}
            <QRCodeSVG value={`${window.location.origin}/join?code=${lobby.code}`} size={200} marginSize={2}
              title={`Scan to join game ${lobby.code}`} role="img" aria-label={`QR code to join game ${lobby.code}`} />
          </div>
        </section>
        <section className="host-teams" aria-label="Players">
          {/* Players who just joined wait here until they pick a team. */}
          {unassignedPlayers.length > 0 && (
            <div className="host-waiting">
              <p>Picking a team:</p>
              <ul className="host-chips" aria-label="Picking a team">
                {unassignedPlayers.map(player => <li className="host-chip" key={player.id}>{player.name}</li>)}
              </ul>
            </div>
          )}
          <div className="host-team-grid">
            {renderTeam("red", "Red team", redPlayers)}
            {renderTeam("blue", "Blue team", bluePlayers)}
          </div>
        </section>
      </main>

      {/* Stays at the bottom of the screen: the player count and Start game. */}
      <footer className="host-footer">
        <span className="host-count" role="status">
          {playerCount} {playerCount === 1 ? 'player' : 'players'}
        </span>
        <button className="host-start" type="button" onClick={startGame} disabled={!canStart}>{starting ? 'Starting game…' : 'Start game'}</button>
      </footer>
    </HostFrame>
  )
}
