import { useState } from 'react'
import { useParams } from 'react-router'
import PlayerLobby from '../components/PlayerLobby'

// Sample data for the preview. What is the API response format??
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
  // TODO (API): Load the session from sessionCode, even when the player opens this URL directly.
  // Show an error if the session is missing or closed. Restore the player after a refresh.
  const [nickname, setNickname] = useState('')

  if (!nickname) {
    return (
      <main>
        <h1>Choose a nickname</h1>
        <p>Game session code: <strong>{sessionCode}</strong></p>
        <form onSubmit={(event) => {
          event.preventDefault()
          const formData = new FormData(event.currentTarget)
          // TODO (API): Send sessionCode and the trimmed nickname to join the session.
          // Use the returned player to enter the lobby. If joining fails, show the error on this form.
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

  // The preview puts you on red and replaces a sample player's name with your nickname.
  // TODO (API): Use the player list from the server, including players without a team.
  const player = { ...sampleSession.player, name: nickname }
  const teams = sampleSession.teams.map((team) => ({
    ...team,
    players: team.players.map((member) => member.id === player.id ? player : member),
  }))

  // TODO (API): Get player list and gameState updates from the server.
  // Show the lobby, game, or results based on gameState. Keep the same URL.
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
