import { useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { AuthError, login, type LoginResult } from '../api/auth'
import OrDivider from '../components/OrDivider'
import PageLayout from '../components/PageLayout'

export default function LoginPage({ onLogin }: { onLogin: (result: LoginResult, remember: boolean) => void }) {
  const pending = useRef(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [needsVerification, setNeedsVerification] = useState(false)
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending.current) return
    const form = new FormData(event.currentTarget)
    pending.current = true
    setBusy(true)
    setError('')
    setNeedsVerification(false)
    try {
      const result = await login(String(form.get('username') || ''), String(form.get('password') || ''))
      onLogin(result, form.get('remember') === 'on')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to log in. Please try again.')
      setNeedsVerification(err instanceof AuthError && err.status === 403)
    } finally {
      pending.current = false
      setBusy(false)
    }
  }
  return (
    <PageLayout>
      <section className="card" aria-labelledby="host-heading">
        <div className="card-body p-4">
          <h2 className="h4 card-title" id="host-heading">Host a game</h2>
          <p className="text-body-secondary">You need an account to host.</p>
          {error && (
            <div className="alert alert-secondary" role="alert">
              <p className="mb-0"><strong>Login failed.</strong> {error}</p>
              {needsVerification && (
                <p className="mb-0 mt-2">No email? <Link to="/verify-email">Send a new link</Link></p>
              )}
            </div>
          )}
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
