import PageLayout from './PageLayout'
import { moveIcons } from '../game/itemArt'
import '../game/Controller.css'

type TeamId = 'red' | 'blue'
type Move = 'attack' | 'block' | 'heal'

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

const moves: Move[] = ['attack', 'block', 'heal']
const moveNames: Record<Move, string> = { attack: 'Attack', block: 'Block', heal: 'Heal' }
// One line on what each button does, so players learn the controls while they wait.
const moveHints: Record<Move, string> = {
  attack: 'Hits the boss, or the other knight',
  block: "Blocks the boss's hit, or shields your knight",
  heal: 'Heals your knight',
}
const teamButtons: Record<TeamId, string> = { red: 'btn-danger', blue: 'btn-primary' }

// A player's phone in the lobby. The host's screen shows who joined.
export default function PlayerLobby({ sessionCode, player, teams, onSelectTeam }: PlayerLobbyProps) {

  // Team selection comes from the server's lobby state
  const teamId = teams.find((team) =>
    team.players.some((member) => member.id === player.id)
  )?.id

  function selectTeam(id: string) {
    if (id !== 'red' && id !== 'blue') return

    onSelectTeam(id)
  }

  // Once a team is picked, the phone takes the team's color and shows its controls, locked until the game starts.
  if (teamId === 'red' || teamId === 'blue') {
    const team = teams.find((entry) => entry.id === teamId)
    const other = teams.find((entry) => entry.id !== teamId)
    return (
      <div className={`controller-page team-${teamId}`}>
        <main className="controller">
          <header className="controller-header">
            <h1 className="controller-team mb-0">{team?.name}</h1>
            <span className="controller-name">{player.name}</span>
          </header>
          <p className="controller-status" role="status">Waiting for the host to start.</p>
          <p className="text-center mb-0">Your buttons, which unlock when the game starts:</p>
          <div className="controller-buttons">
            {moves.map((move) => (
              <div className={`controller-button controller-preview move-${move}`} key={move}>
                <img src={moveIcons[move]} alt="" />
                <span>
                  <span className="controller-label">{moveNames[move]}</span>
                  <span className="controller-detail">{moveHints[move]}</span>
                </span>
              </div>
            ))}
          </div>
          {other && (
            <button className="btn btn-outline-dark" type="button" onClick={() => selectTeam(other.id)}>
              Switch to {other.name}
            </button>
          )}
        </main>
      </div>
    )
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
              <button
                className={`btn btn-lg flex-fill text-nowrap ${teamButtons[team.id as TeamId] ?? 'btn-dark'}`}
                type="button"
                onClick={() => selectTeam(team.id)}
                key={team.id}
              >
                {team.name}
              </button>
            ))}
          </div>
        </div>
      </section>
    </PageLayout>
  )
}
