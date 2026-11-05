import { useNavigate } from 'react-router'
import PageLayout from '../components/PageLayout'

export default function JoinPage() {
  const navigate = useNavigate()

  return (
    <PageLayout>
      <section className="card" aria-labelledby="join-heading">
        <div className="card-body p-4">
          <h1 className="h4 card-title mb-3" id="join-heading">Join a game</h1>
          <form onSubmit={(event) => {
            event.preventDefault()
            const formData = new FormData(event.currentTarget)
            const sessionCode = String(formData.get('sessionCode') ?? '').trim()
            // TODO (API): Check the code before opening PlayPage.
            // Show an error if the session is missing or closed.
            if (sessionCode) navigate(`/play/${encodeURIComponent(sessionCode)}`)
          }}>
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
                pattern=".*\S.*"
                required
                autoFocus
              />
            </div>
            <button className="btn btn-dark w-100" type="submit">Next</button>
          </form>
        </div>
      </section>
    </PageLayout>
  )
}
