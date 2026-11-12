import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { socket } from '../socket/socket'
import PageLayout from '../components/PageLayout'
import type { LobbyResponse } from '../socket/lobby'

export default function JoinPage() {
  const navigate = useNavigate()
  // The host's QR code links here with ?code=, so a scan only needs a nickname.
  const [searchParams] = useSearchParams()
  const linkedCode = (searchParams.get('code') ?? '').trim().toUpperCase().slice(0, 6)

  const [code, setCode] = useState(linkedCode)
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [joining, setJoining] = useState(false)

  function joinLobby(event: React.SubmitEvent<HTMLFormElement>) {

    event.preventDefault()

    if (joining) return

    const sessionCode = code.trim().toUpperCase()
    const nickname = name.trim()

    if(!nickname || !sessionCode) {
      setError('Please enter a nickname and session code!')
      return
    }

    if(!sessionCode) {
      setError('Please enter a session code!')
      return
    }

    setJoining(true)
    setError('')

    function sendJoinRequest() {
      socket.timeout(5000).emit(
        "game:join",
        {
          code: sessionCode,
          name: nickname
        }, (err: Error | null, response: LobbyResponse) => {
          setJoining(false) 
          if (err) {
            console.error("Join request failed:", err)
            setError(response?.error || "Server not responding.")
            return
          }
          if(!response?.success || !response.lobby) {
            setError(response?.error || "Invalid lobby code.")
            return
          }
          console.log("Join request successful:", response.lobby)
          navigate(`/lobby/${response.lobby.code}`)
        }
      )
    }

    if(socket.connected) {
      sendJoinRequest()
    } else {
      socket.connect()
      socket.timeout(5000).once("connect", () => {
        sendJoinRequest()
      })
      socket.once("connect_error", () => {
        setJoining(false)
        setError("Unable to connect to server.")
      })
    }

  }

  return (
    <PageLayout>
      <section className="card" aria-labelledby="join-heading">
        <div className="card-body p-4">
          <h1 className="h4 card-title mb-3" id="join-heading">Join a game</h1>
          <form onSubmit={joinLobby}>
            <div className="mb-3">
              <label htmlFor="nickname" className="form-label visually-hidden">Nickname</label>
              <input
              id="nickname"
              className="form-control"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={20}
              required
              disabled={joining}
              placeholder="Enter your nickname"
              aria-label="Nickname"
              autoFocus={Boolean(linkedCode)}
              />
            </div>
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
                value={code}
                onChange={(event) => {
                  setCode(event.target.value.toUpperCase())
                  setError('')
                }}
                pattern=".*\S.*"
                required
                autoFocus={!linkedCode}
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
