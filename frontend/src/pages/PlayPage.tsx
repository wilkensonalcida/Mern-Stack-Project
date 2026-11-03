import { useState } from 'react'
import { useParams } from 'react-router'
import PlayerLobby from '../components/PlayerLobby'

// Temporary UI data. Replace it with the session and player returned by the API.
// This shape describes the preview, not an agreed API contract.
const sampleSession = {
  gameState: 'lobby',
  player: { id: 'player-1', name: 'Nathan' },
  teams: [
    {
      id: 'red',
      name: 'Red team',
      players: [
        { id: 'player-1', name: 'Nathan' },
        { id: 'player-2', name: 'Nate' },
        { id: 'player-3', name: 'Nathaniel Bob' },
      ],
    },
    {
      id: 'blue',
      name: 'Blue team',
      players: [
        { id: 'player-4', name: 'Nathanael' },
        { id: 'player-5', name: 'Nathan Bobby Brown' },
        { id: 'player-6', name: 'Nootu' },
      ],
    },
  ],
}

export default function PlayPage() {
  const { sessionCode } = useParams<'sessionCode'>()
  // TODO (API): Load the session by sessionCode, including when this URL is opened directly.
  // Handle missing or closed sessions here. Restore the player's identity after a refresh
  // using the agreed guest session mechanism; nickname state alone cannot identify a player.
  const [nickname, setNickname] = useState('')

  if (!nickname) {
    return (
      <main>
        <h1>Choose a nickname</h1>
        <p>Game session code: <strong>{sessionCode}</strong></p>
        <form onSubmit={(event) => {
          event.preventDefault()
          const formData = new FormData(event.currentTarget)
          // TODO (API): Join as a guest with sessionCode and the trimmed nickname.
          // Enter the lobby after success, using the returned player identity.
          // Keep this form visible and show the error if the request fails.
          setNickname(String(formData.get('nickname') ?? '').trim())
        }}>
          <label htmlFor="player-nickname">Nickname</label>
          <input
            type="text"
            id="player-nickname"
            name="nickname"
            autoComplete="nickname"
            pattern=".*\S.*"
            required
          />
          <button type="submit">Enter lobby</button>
        </form>
      </main>
    )
  }

  // Preview shortcut: replace a sample player's name, keeping their existing red team.
  // TODO (API): Use the real player and roster, including players who have not chosen a team.
  const player = { ...sampleSession.player, name: nickname }
  const teams = sampleSession.teams.map((team) => ({
    ...team,
    players: team.players.map((member) => member.id === player.id ? player : member),
  }))

  // TODO (API): Keep the roster and gameState updated through the agreed live update mechanism.
  // Use gameState to switch to gameplay or results here without changing the session URL.
  return (
    <main>
      {sampleSession.gameState === 'lobby' && (
        <PlayerLobby
          sessionCode={sessionCode ?? ''}
          player={player}
          teams={teams}
        />
      )}
    </main>
  )
}
