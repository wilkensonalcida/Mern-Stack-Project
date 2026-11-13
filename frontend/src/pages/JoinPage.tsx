import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { socket } from '../socket/socket'
import '../game/Controller.css'
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
    <div className="controller-page team-none is-form">
      <main className="controller">
        <header className="controller-header">
          <span className="controller-team">Fight Me Bro</span>
        </header>
        <h1 className="phone-heading" id="join-heading">Join a game</h1>
        <form className="phone-form" onSubmit={joinLobby} aria-labelledby="join-heading">
          <label htmlFor="nickname" className="phone-label">Nickname</label>
          <input
            id="nickname"
            className="phone-input"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={20}
            required
            disabled={joining}
            placeholder="Enter your nickname"
            autoFocus={Boolean(linkedCode)}
          />
          <label htmlFor="session-code" className="phone-label">Game code</label>
          <input
            className="phone-input is-code"
            type="text"
            id="session-code"
            name="sessionCode"
            placeholder="Enter game code"
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
          <button className="phone-button" type="submit" disabled={joining || !code.trim()}>{joining ? 'Joining…' : 'Next'}</button>
        </form>
        {error && <p className="phone-error" role="alert">{error}</p>}
      </main>
    </div>
  )
}
