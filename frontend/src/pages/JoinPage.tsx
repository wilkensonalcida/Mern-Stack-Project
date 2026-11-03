import { Link, useNavigate } from 'react-router'

export default function JoinPage() {
  const navigate = useNavigate()

  return (
    <main>
      <h1>Join a game</h1>
      <p>Enter the session code from your host.</p>
      <form onSubmit={(event) => {
        event.preventDefault()
        const formData = new FormData(event.currentTarget)
        const sessionCode = String(formData.get('sessionCode') ?? '').trim()
        if (sessionCode) navigate(`/play/${encodeURIComponent(sessionCode)}`)
      }}>
        <div>
          <label htmlFor="session-code">Session code</label>
          <input
            type="text"
            id="session-code"
            name="sessionCode"
            autoComplete="off"
            spellCheck={false}
            pattern=".*\S.*"
            required
          />
        </div>
        <button type="submit">Join game</button>
      </form>
      <p><Link to="/">Back to home</Link></p>
    </main>
  )
}
