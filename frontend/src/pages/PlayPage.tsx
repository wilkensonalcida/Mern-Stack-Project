import { useState } from 'react'
import { useParams } from 'react-router'
import PageLayout from '../components/PageLayout'
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
      <PageLayout>
        <section className="card" aria-labelledby="nickname-heading">
          <div className="card-body p-4">
            <div className="d-flex align-items-center justify-content-between gap-3 mb-3">
              <h1 className="h4 card-title mb-0" id="nickname-heading">Choose a nickname</h1>
              <span className="border rounded px-2 py-1 fw-semibold text-nowrap" aria-label={`Game code ${sessionCode}`}>{sessionCode}</span>
            </div>
            <form onSubmit={(event) => {
              event.preventDefault()
              const formData = new FormData(event.currentTarget)
              // TODO (API): Send sessionCode and the trimmed nickname to join the session.
              // Use the returned player to enter the lobby. If joining fails, show the error on this form.
              setNickname(String(formData.get('nickname') ?? '').trim())
            }}>
              <div className="mb-3">
                <input
                  className="form-control form-control-lg text-center"
                  type="text"
                  id="player-nickname"
                  name="nickname"
                  placeholder="Enter a nickname"
                  aria-label="Nickname"
                  autoComplete="nickname"
                  pattern=".*\S.*"
                  required
                  autoFocus
                />
              </div>
              <button className="btn btn-dark w-100" type="submit">Join game</button>
            </form>
          </div>
        </section>
      </PageLayout>
    )
  }

  // The preview starts you without a team, the way a new player joins.
  // TODO (API): Use the player list from the server, including players without a team.
  const player = { ...sampleSession.player, name: nickname }
  const teams = sampleSession.teams

  // TODO (API): Get player list and gameState updates from the server.
  // Show the lobby, game, or results based on gameState. Keep the same URL.
  return (
    <>
      {sampleSession.gameState === 'lobby' && (
        <PlayerLobby
          sessionCode={sessionCode ?? ''}
          player={player}
          teams={teams}
        />
      )}
    </>
  )
}
