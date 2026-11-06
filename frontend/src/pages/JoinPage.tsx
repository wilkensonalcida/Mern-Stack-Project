import { useState } from 'react'
import { useNavigate } from 'react-router'
import { socket } from '../socket/socket'
import PageLayout from '../components/PageLayout'
import type { User } from '../api/auth'
import type { LobbyResponse } from '../socket/lobby'

interface activeUser {
  user: User
}

export default function JoinPage({ user } : activeUser) {
  const navigate = useNavigate()

  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [joining, setJoining] = useState(false)

  function joinLobby(event: React.SubmitEvent<HTMLFormElement>) {

    event.preventDefault()
    if (joining) return
    const sessionCode = code.trim().toUpperCase()

    if(!sessionCode) {
      setError('Please enter a session code!')
      return
    }

    setJoining(true)
    setError('')

    socket.timeout(5000).emit(
      "game:join",
      {
        code: code.trim().toUpperCase(),
        name: user.firstName || user.login,
      }, (err: Error | null, response: LobbyResponse) => {
        if (err) {
          setError(response?.error || "Server not responding.")
          return
        }
        if (err || !response?.success || !response.lobby) {
          setError(response?.error || "Invalid lobby code.")
          return
        }
        navigate(`/lobby/${response.lobby.code}`)
      }
    )
  }

  return (
    <PageLayout>
      <section className="card" aria-labelledby="join-heading">
        <div className="card-body p-4">
          <h1 className="h4 card-title mb-3" id="join-heading">Join a game</h1>
          <form onSubmit={joinLobby}>
            <div className="mb-3">
              <input
                className="form-control form-control-lg text-center"
                type="text"
                id="session-code"
                name="sessionCode"
                placeholder="Enter game code"
                aria-label="Game code"
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                maxLength={6}
                onChange={(event) => {
                  setCode(event.target.value.toUpperCase())
                  setError('')
                }}
                pattern=".*\S.*"
                required
                autoFocus
                disabled={joining}
              />
            </div>
            <button className="btn btn-dark w-100" type="submit" disabled={joining || !code.trim()}>{joining ? 'Joining...' : 'Next'}</button>
          </form>
           {error && (
            <p className="text-danger mt-3" role="alert">
              {error}
            </p>
          )}
        </div>
      </section>
    </PageLayout>
  )
}
