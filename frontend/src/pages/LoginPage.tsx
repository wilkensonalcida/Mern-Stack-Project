import { useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { AuthError, login, type LoginResult } from '../api/auth'
import OrDivider from '../components/OrDivider'
import PageLayout from '../components/PageLayout'
import VerifyWait from '../components/VerifyWait'

type Waiting = { loginName: string; password: string; remember: boolean }

export default function LoginPage({ onLogin }: { onLogin: (result: LoginResult, remember: boolean) => void }) {
  const pending = useRef(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [waiting, setWaiting] = useState<Waiting | null>(null)
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending.current) return
    const form = new FormData(event.currentTarget)
    const loginName = String(form.get('username') || '')
    const password = String(form.get('password') || '')
    const remember = form.get('remember') === 'on'
    pending.current = true
    setBusy(true)
    setError('')
    try {
      const result = await login(loginName, password)
      onLogin(result, remember)
    } catch (err) {
      // The password was right but the email isn't verified, so wait for the emailed link instead.
      if (err instanceof AuthError && err.status === 403) setWaiting({ loginName, password, remember })
      else setError(err instanceof Error ? err.message : 'Unable to log in. Please try again.')
    } finally {
      pending.current = false
      setBusy(false)
    }
  }
  if (waiting) return (
    <PageLayout>
      <VerifyWait {...waiting} onLogin={onLogin} />
    </PageLayout>
  )
  return (
    <PageLayout>
      <section className="card" aria-labelledby="host-heading">
        <div className="card-body p-4">
          <h2 className="h4 card-title" id="host-heading">Host a game</h2>
          <p className="text-body-secondary">You need an account to host.</p>
          {error && <div className="alert alert-secondary" role="alert"><strong>Login failed.</strong> {error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label" htmlFor="username">Username</label>
              <input
                className="form-control"
                type="text"
                id="username"
                name="username"
                autoComplete="username"
                required
              />
            </div>
            <div className="mb-3">
              <label className="form-label" htmlFor="password">Password</label>
              <input
                className="form-control"
                type="password"
                id="password"
                name="password"
                autoComplete="current-password"
                required
              />
            </div>
            <div className="form-check mb-3">
              <input className="form-check-input" type="checkbox" id="remember" name="remember" />
              <label className="form-check-label" htmlFor="remember">Remember me</label>
            </div>
            <button className="btn btn-dark w-100" type="submit" disabled={busy}>{busy ? 'Logging in…' : 'Log in'}</button>
          </form>
          <p className="mt-3 mb-0 text-center">Need an account? <Link to="/register">Register</Link></p>
        </div>
      </section>

      <OrDivider />

      <Link className="btn btn-outline-dark w-100" to="/join" aria-describedby="join-help">Join a game</Link>
      <p className="text-body-secondary text-center mt-2 mb-0" id="join-help">Have a code? No account needed.</p>
    </PageLayout>
  )
}
