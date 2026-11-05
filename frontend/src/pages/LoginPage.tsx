import { useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { AuthError, login, type LoginResult } from '../api/auth'

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
    <>
      <div className="login-container">
        <h1 className="login-title">Login to Fight Me Bro!</h1>
      </div>
      <form id="login-form" onSubmit={handleSubmit}>
        <div className="login-form">
          <label htmlFor="username">Username</label>
          <input
            className="form-text"
            type="text"
            id="username"
            name="username"
            placeholder="Username"
            autoComplete="username"
            required
          />
          <label htmlFor="password">Password</label>
          <input
            className="form-text"
            type="password"
            id="password"
            name="password"
            placeholder="Password"
            autoComplete="current-password"
            required
          />
          <div className="login-row">
            <label className="remember-label" htmlFor="remember">
              <input className="remember-input" type="checkbox" id="remember" name="remember" />
              Remember me!
            </label>
          </div>
          <p>Remember me keeps this login on this browser until the login token expires.</p>
          {error && <p role="alert">{error}</p>}
          {needsVerification && <p><Link to="/verify-email">Request a verification email</Link></p>}
          <button className="btn-primary" type="submit" disabled={busy}>{busy ? 'Logging in…' : 'Login'}</button>
          <div className="login-divider">
            <span>OR</span>
          </div>
          <Link className="btn-primary" to="/register">Sign Up</Link>
        </div>
      </form>
    </>
  )
}
