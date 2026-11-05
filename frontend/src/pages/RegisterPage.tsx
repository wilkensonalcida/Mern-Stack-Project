import { useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { register, type SignupResult } from '../api/auth'

export default function RegisterPage() {
  const pending = useRef(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<SignupResult | null>(null)
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending.current) return
    const form = new FormData(event.currentTarget)
    const password = String(form.get('password') || '')
    setError('')
    if (password !== String(form.get('confirmPassword') || '')) {
      setError('Passwords do not match')
      return
    }
    pending.current = true
    setBusy(true)
    try {
      setResult(await register({
        firstName: String(form.get('firstName') || ''),
        lastName: String(form.get('lastName') || ''),
        login: String(form.get('login') || ''),
        email: String(form.get('email') || ''),
        password
      }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to register. Please try again.')
    } finally {
      pending.current = false
      setBusy(false)
    }
  }
  return (
    <main>
      <h1>Create an account</h1>
      {result ? <>
        <p role="status">{result.message}</p>
        <p>{result.emailVerification.message}</p>
        <p><Link to="/verify-email">Request another verification email</Link></p>
      </> : <>
        <p>Enter your details. Verify your email before logging in.</p>
        <form onSubmit={handleSubmit}>
          <div>
            <label htmlFor="register-first-name">First name</label>
            <input id="register-first-name" name="firstName" autoComplete="given-name" required />
          </div>
          <div>
            <label htmlFor="register-last-name">Last name</label>
            <input id="register-last-name" name="lastName" autoComplete="family-name" required />
          </div>
          <div>
            <label htmlFor="register-email">Email</label>
            <input id="register-email" name="email" type="email" autoComplete="email" required />
          </div>
          <div>
            <label htmlFor="register-username">Username</label>
            <input id="register-username" name="login" autoComplete="username" required />
          </div>
          <div>
            <label htmlFor="register-password">Password</label>
            <input id="register-password" name="password" type="password" autoComplete="new-password" required />
          </div>
          <div>
            <label htmlFor="register-confirm-password">Confirm password</label>
            <input id="register-confirm-password" name="confirmPassword" type="password" autoComplete="new-password" required />
          </div>
          {error && <p role="alert">{error}</p>}
          <button type="submit" disabled={busy}>{busy ? 'Creating account…' : 'Create account'}</button>
        </form>
      </>}
      <p>Already have an account? <Link to="/login">Log in</Link></p>
    </main>
  )
}
