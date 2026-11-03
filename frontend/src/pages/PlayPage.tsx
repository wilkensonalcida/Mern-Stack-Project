import { useState } from 'react'
import { useParams } from 'react-router'
import PlayerLobby from '../components/PlayerLobby'

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
  const [nickname, setNickname] = useState('')

  if (!nickname) {
    return (
      <main>
        <h1>Choose a nickname</h1>
        <p>Game session code: <strong>{sessionCode}</strong></p>
        <form onSubmit={(event) => {
          event.preventDefault()
          const formData = new FormData(event.currentTarget)
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

  const player = { ...sampleSession.player, name: nickname }
  const teams = sampleSession.teams.map((team) => ({
    ...team,
    players: team.players.map((member) => member.id === player.id ? player : member),
  }))

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
