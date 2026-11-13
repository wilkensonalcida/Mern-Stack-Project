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
const teamLabels: Record<TeamId, string> = { red: 'Red team', blue: 'Blue team' }
const isTeam = (id: string): id is TeamId => id === 'red' || id === 'blue'

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
    const other = teams.find((entry) => entry.id !== teamId)
    return (
      <div className={`controller-page team-${teamId}`}>
        <main className="controller">
          <header className="controller-header">
            <h1 className="controller-team">{teamLabels[teamId]}</h1>
            <span className="controller-name">{player.name}</span>
          </header>
          <p className="controller-status" role="status">Waiting for the host to start.</p>
          <p className="phone-note">Your buttons, which unlock when the game starts:</p>
          <div className="controller-buttons">
            {moves.map((move) => (
              <div className={`controller-button controller-preview move-${move}`} key={move}>
                <span className="controller-art"><img src={moveIcons[move]} alt="" /></span>
                <span className="controller-label">
                  {moveNames[move]}
                  <span className="controller-detail">{moveHints[move]}</span>
                </span>
              </div>
            ))}
          </div>
          {other && isTeam(other.id) && (
            <div className="phone-actions">
              <button className={`phone-button is-outline to-${other.id}`} type="button" onClick={() => selectTeam(other.id)}>
                Switch to {teamLabels[other.id]}
              </button>
            </div>
          )}
        </main>
      </div>
    )
  }

  // Before a pick: one big tile per team, with who's already on it.
  return (
    <div className="controller-page team-none">
      <main className="controller">
        <header className="controller-header">
          <span className="controller-team">Fight Me Bro</span>
          <span className="controller-name is-code" aria-label={`Game code ${sessionCode}`}>{sessionCode}</span>
        </header>
        <h1 className="phone-heading" id="lobby-heading">Choose a team</h1>
        <div className="controller-buttons" role="group" aria-labelledby="lobby-heading">
          {teams.filter((team) => isTeam(team.id)).map((team) => (
            <button
              className={`controller-button team-tile pick-${team.id}`}
              type="button"
              onClick={() => selectTeam(team.id)}
              key={team.id}
            >
              <span className="controller-label">{teamLabels[team.id as TeamId]}</span>
              <span className="controller-detail">
                {team.players.length ? team.players.map((member) => member.name).join(', ') : 'No players yet'}
              </span>
            </button>
          ))}
        </div>
      </main>
    </div>
  )
}
