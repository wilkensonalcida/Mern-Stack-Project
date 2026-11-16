import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { socket } from '../socket/socket'
import { QRCodeSVG } from 'qrcode.react'
import { HostBossFights } from '../game/EnemyFight'
import TeamFight from '../game/TeamFight'
import HostResults from '../game/HostResults'
import { EndButton, HostFrame, HostMessage } from '../game/HostFrame'
import { KNOCKOUT_MS } from '../game/knockout'
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
  // The results wait while the arena holds the final blow.
  const [showResults, setShowResults] = useState(false)
  const [boss, setBoss] = useState<{ state: HostBossState, receivedAt: number } | null>(null)
  const [pvpStarted, setPvpStarted] = useState(false)

  useEffect(() => {
    if (!code) return;

    function onUpdate(updatedLobby: Lobby) {
      if(updatedLobby.code === code) {
        setLobby(updatedLobby)
        // A refused start's reason is stale once the lobby changes.
        setError("")
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

    let knockout = 0
    let finishedGame = false
    function onFinished(finished: GameResult) {
      if (finished.code === code) {
        finishedGame = true
        setResult(finished)
        window.clearTimeout(knockout)
        knockout = window.setTimeout(() => setShowResults(true), KNOCKOUT_MS)
      }
    }

    // The lobby went: the host ended it, or every phone left. Once the game has a result,
    // the results stay up, since the last phones leave while the room is still reading them.
    function onCancelled() {
      if (!finishedGame) navigate('/')
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
    window.clearTimeout(knockout)
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

  // Puts a guest who's still picking onto the smaller team, so one idle phone can't hold up the start.
  // The server picks the team, since this screen's lobby can be a click behind.
  function placePlayer(playerId: string) {
    if (!lobby) return
    socket.timeout(5000).emit(
      "game:assign",
      { code: lobby.code, playerId },
      (err: Error | null, response: { success: boolean, error?: string }) => {
        if (err || !response?.success) setError(response?.error || "Unable to place that player.")
      }
    )
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
    if (pvpStarted && !showResults) {
      return <TeamFight code={lobby.code} onEndGame={cancelGame} />
    }
    if (boss && !showResults) {
      return <HostBossFights state={boss.state} receivedAt={boss.receivedAt} onEndGame={cancelGame} />
    }
    if (result) {
      return <HostResults result={result} lobby={lobby} error={error} onNewGame={backToDashboard} />
    }
    return (
      <HostFrame action={<EndButton label="End game" confirmLabel="End for everyone?" onConfirm={cancelGame} />}>
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
  // What Start game is waiting for, so the host can tell the room.
  const waitingFor =
    playerCount === 0 ? "Waiting for players to join"
    : unassignedPlayers.length === 1 ? `Waiting for ${unassignedPlayers[0].name} to pick a team`
    : unassignedPlayers.length > 1 ? `Waiting for ${unassignedPlayers.length} players to pick a team`
    : redPlayers.length === 0 ? "Red team needs a player"
    : bluePlayers.length === 0 ? "Blue team needs a player"
    : null
  
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
          <p className="host-empty">Nobody yet</p>
        )}
      </section>
    )
  }

  return (
    <HostFrame action={<EndButton label="Cancel match" confirmLabel="Cancel for everyone?" onConfirm={cancelGame} disabled={!isHost} />}>
      <main className="host-lobby">
        <section className="host-join" aria-labelledby="code-heading">
          {/* The code is the screen's heading, with where to type it on one line under it, and the QR code beside. */}
          <div className="host-join-code">
            <h1 className="host-code" id="code-heading" aria-label={`Game code ${lobby.code}`}>{lobby.code}</h1>
            <p className="host-join-url">Go to <strong>{window.location.host}/join</strong> and type this code, or scan</p>
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
              <p>Picking a team. Click a name to put them on the smaller team:</p>
              <ul className="host-chips" aria-label="Picking a team">
                {unassignedPlayers.map(player => (
                  <li key={player.id}>
                    <button className="host-chip" type="button" onClick={() => placePlayer(player.id)}>{player.name}</button>
                  </li>
                ))}
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
        {error
          ? <p className="host-footer-note is-error" role="alert">{error}</p>
          : waitingFor && <p className="host-footer-note" role="status">{waitingFor}</p>}
        <span className="host-count" role="status">
          {playerCount} {playerCount === 1 ? 'player' : 'players'}
        </span>
        <button className="host-start" type="button" onClick={startGame} disabled={!canStart}>{starting ? 'Starting game…' : 'Start game'}</button>
      </footer>
    </HostFrame>
  )
}
