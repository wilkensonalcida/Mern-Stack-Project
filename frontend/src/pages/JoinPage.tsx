import { useState } from 'react'
import { useNavigate } from 'react-router'
import { command, guestToken } from '../api/matches'
import PageLayout from '../components/PageLayout'


export default function JoinPage() {
  const navigate = useNavigate()

  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [joining, setJoining] = useState(false)

  async function joinLobby(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (joining) return
    const sessionCode = code.trim().toUpperCase()
    setJoining(true); setError('')
    try {
      const credential = guestToken(sessionCode, true)
      const response = await command('game:join', { code: sessionCode, name: name.trim(), guestToken: credential })
      navigate('/lobby/' + response.match.code)
    } catch (e) { setError((e as Error).message) }
    finally { setJoining(false) }
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
