import { useState } from 'react'
import PageLayout from './PageLayout'

type TeamId = 'red' | 'blue'

type PlayerLobbyProps = {
  sessionCode: string
  player: { id: string; name: string }
  teams: {
    id: string
    name: string
    players: { id: string; name: string }[]
  }[]
  onSelectTeam: (team: TeamId) => void
}

// A player's phone shows only which team they're on. The host's screen shows who joined.
export default function PlayerLobby({ sessionCode, player, teams, onSelectTeam }: PlayerLobbyProps) {

  // Team selection comes from the server's lobby state
  const teamId = teams.find((team) =>
    team.players.some((member) => member.id === player.id)
  )?.id

  function selectTeam(id: string) {
    if (id !== 'red' && id !== 'blue') return

    onSelectTeam(id)
  }

  

  return (
    <PageLayout>
      <section className="card" aria-labelledby="lobby-heading">
        <div className="card-body p-4">
          <div className="d-flex align-items-center justify-content-between gap-3 mb-3">
            <h1 className="h4 card-title mb-0" id="lobby-heading">Choose a team</h1>
            <span className="border rounded px-2 py-1 fw-semibold text-nowrap" aria-label={`Game code ${sessionCode}`}>{sessionCode}</span>
          </div>
          <div className="d-flex gap-2" role="group" aria-labelledby="lobby-heading">
            {teams.map((team) => (
              // TODO (API): Have PlayPage send this team choice to the server, and only switch once it agrees.
              // Show an error here if the request fails.
              <button
                className={`btn btn-lg flex-fill text-nowrap ${teamId === team.id ? 'btn-dark' : 'btn-outline-dark'}`}
                type="button"
                aria-pressed={teamId === team.id}
                onClick={() => selectTeam(team.id)}
                key={team.id}
              >
                {team.name}
              </button>
            ))}
          </div>
           
          {/* The waiting line appears once a team is picked. The status region stays, so screen readers announce it. */}
          <div role="status">
            {teamId && <p className="text-body-secondary text-center mt-3 mb-0">Waiting for the host to start the game.</p>}
          </div>
        </div>
      </section>
    </PageLayout>
  )
}
