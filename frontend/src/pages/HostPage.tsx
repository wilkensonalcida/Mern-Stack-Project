import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import PageLayout from '../components/PageLayout'
import TeamFight from '../game/TeamFight'
import { socket } from '../socket/socket'

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

  const [teamError, setTeamError] = useState("");
  const [selectingTeam, setSelectingTeam] = useState(false);
  
  useEffect(() => {
    if (!code) return;

    function onUpdate(updatedLobby: Lobby) {
      if(updatedLobby.code === code) {
        setLobby(updatedLobby)
      }
    }
    // The host stays on this page, which swaps the lobby for the fight.
    function onStarted(updatedLobby : Lobby) {
      if(updatedLobby.code === code){
        setLobby(updatedLobby)
      }
    }

    function onCancelled() {
      navigate(`/dashboard`)
    }

    socket.on("game:updated", onUpdate)
    socket.on("game:started", onStarted)
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
      }
  )

  return () => {
    socket.off("game:updated", onUpdate)
    socket.off("game:started", onStarted)
    socket.off("game:cancelled",)
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
    navigate(` /dashboard`)
  }

  if(error && !lobby) {
    return (
      <PageLayout>
        <p className="text-danger">{error}</p>
        <button className="btn btn-outline-dark" onClick={(() => navigate(` /dashboard`))}>Back to dashboard</button>
      </PageLayout>
    )
  }

  if(!lobby){
    return (
      <PageLayout>
        <p>Loading lobby...</p>
      </PageLayout>
    )
  }

  if (lobby.status === 'playing') {
    return <TeamFight />
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

  const teamCapacity = lobby.maxPlayers / 2;

  const currentHost = lobby.players.find(
    player => player.id === lobby.hostId
  );

  const hostTeam = currentHost?.team;
  
  function selectTeam(team: TeamId) {
    if (!lobby || selectingTeam) return;
  
    setSelectingTeam(true);
    setTeamError("");
  
    socket.timeout(5000).emit(
      "game:team",
      team,
      (
        err: Error | null,
        response: {
          success: boolean;
          error?: string;
        }
      ) => {
        setSelectingTeam(false);
  
        if (err || !response?.success) {
          setTeamError(
            response?.error || "Unable to select team."
          );
        }
      }
    );
  }
  
  function renderTeam(
    teamId: TeamId,
    name: string,
    players: LobbyPlayer[]
  ) {
    return (
      <div className="col-6" key={teamId}>
        <section className="card h-100">
          <div className="card-body">
            <h2 className="h6 card-title text-center mb-2">
              {name}
            </h2>
            {players.length > 0 ? (
              <ul className="d-fles fles-wrap jusitfy-content-center gap-2 list-unstyled mb-0">
                {players.map(player => (
                  <li className="border roundes px-2 py-1" key={player.id}>
                    {player.name}
                    {player.id === lobby?.hostId && (
                      <span className="text-body-secondary">
                        {""}(Host)</span>
                    )}
                  </li>
                )
              )}
              </ul>
            ) : (
              <p className="text-body-secondary text-center mb-0">
                No players yet.
              </p>
            )}
          </div>
        </section>
      </div>
    )
  }
  
  return (
    <PageLayout wide>
      {/* Fills the screen above the bar. 3rem is the page's own padding, and 88 pixels leave room for the bar. */}
      <div className="d-flex flex-column" style={{ minHeight: 'calc(100vh - 3rem)', paddingBottom: 88 }}>
        <section className="card" aria-labelledby="code-heading">
          <div className="card-body py-4">
            {/* Where to join sits at the left edge and the QR code at the right, so the code stays in the middle. */}
            <div className="row align-items-center row-gap-3">
              <div className="col-md-3 order-2 order-md-1 text-center text-md-start">
                <p className="text-body-secondary mb-0">Join at</p>
                <p className="fs-5 fw-semibold mb-0">{window.location.host}/join</p>
              </div>
              <div className="col-md-6 order-1 order-md-2 text-center">
                <h1 className="fs-6 fw-normal text-body-secondary mb-1" id="code-heading">Game session code</h1>
                <p className="display-1 fw-bold mb-0">{lobby.code}</p>
              </div>
              <div className="col-md-3 order-3 d-flex justify-content-center justify-content-md-end">
                {/* TODO (API): Show a QR code here that opens /play with this game code. */}
                <div
                  className="border rounded d-flex align-items-center justify-content-center small text-body-secondary"
                  style={{ width: 176, height: 176 }}
                >
                  QR code
                </div>
              </div>
            </div>
          </div>
        </section>
        <section className="card mt-3">
          <div className="card-body text-center">
            <h2 className="h5 mb-3">
              Choose your team
            </h2>

            <div className="d-flex gap-3 justify-content-center">
              {(["red", "blue"] as TeamId[]).map(team => {
                const players = lobby.players.filter(player => player.team === team);
                const isFull = players.length >= teamCapacity;
                const isSelected = hostTeam === team;

                return (
                  <button key={team} type="button" className={`btn btn-lg ${isSelected? "btn-dark": "btn-outline-dark"}`} onClick={() => selectTeam(team)} disabled={ selectingTeam || (isFull && !isSelected)}>
                    {team === "red" ? "Red" : "Blue"} Team
                    {" "}
                  </button>
                );
              })}
            </div>
            {teamError && (<p className="text-danger mt-3" role="alert">{teamError}</p>)}
          </div>
        </section>
        <section className="flex-grow-1 d-flex flex-column justify-content-center py-4" aria-label="Players">
          {/* Players who just joined wait here until they pick a team. */}
          {unassignedPlayers.length > 0 && (
            <ul className="d-flex flex-wrap justify-content-center gap-2 list-unstyled mb-3" aria-label="Waiting for a team">
              {unassignedPlayers.map(player => (
                <li className="border rounded px-2 py-1" key={player.id}>{player.name}{player.id === lobby.hostId && " (Host)"}</li>
              ))}
            </ul>
          )}
          <div className="row g-3">
            {renderTeam("red", "Red team", redPlayers)}
            {renderTeam("blue", "Blue team", bluePlayers)}
          </div>
        </section>
        {/* With the bar's room, this matches the code banner's height on wider screens, */}
        {/* so the players sit at the middle of the screen, not the middle of the space below the code. */}
        <div className="d-none d-md-block flex-shrink-0" aria-hidden="true" style={{ height: 139 }} />
      </div>

      {/* Stays at the bottom of the screen: cancel on the left, the player count and start on the right. */}
      <div className="position-fixed bottom-0 start-0 end-0 p-3 bg-body d-flex justify-content-between align-items-center gap-3">
        <button className="btn btn-outline-dark text-nowrap" type="button" onClick={cancelGame} disabled={!isHost}>Cancel match</button>
        <div className="d-flex align-items-center gap-3">
          <span className="fs-5 text-body-secondary text-nowrap" role="status">
            {playerCount} {playerCount === 1 ? 'player' : 'players'}
          </span>
          <button className="btn btn-dark px-md-5 text-nowrap" type="button" onClick={startGame} disabled={!isHost || starting}>{starting ? 'Starting game...' : 'Start game'}</button>
        </div>
      </div>
    </PageLayout>
  )
}
