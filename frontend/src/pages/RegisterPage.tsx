import { useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { register, type LoginResult } from '../api/auth'
import PageLayout from '../components/PageLayout'
import VerifyWait from '../components/VerifyWait'

type Waiting = { loginName: string; password: string; email?: string; emailSent: boolean }

export default function RegisterPage({ onLogin }: { onLogin: (result: LoginResult, remember: boolean) => void }) {
  const pending = useRef(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [waiting, setWaiting] = useState<Waiting | null>(null)
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
    const loginName = String(form.get('login') || '')
    pending.current = true
    setBusy(true)
    try {
      const result = await register({
        firstName: String(form.get('firstName') || ''),
        lastName: String(form.get('lastName') || ''),
        login: loginName,
        email: String(form.get('email') || ''),
        password
      })
      // Waits on this page until the emailed link is clicked, then logs in without asking again.
      setWaiting({
        loginName,
        password,
        email: result.user.email,
        emailSent: result.emailVerification.delivery === 'sent'
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to register. Please try again.')
    } finally {
      pending.current = false
      setBusy(false)
    }
  }
  if (waiting) return (
    <PageLayout>
      <VerifyWait {...waiting} remember={false} onLogin={onLogin} />
    </PageLayout>
  )

  return (
    <PageLayout>
      <section className="card" aria-labelledby="register-heading">
        <div className="card-body p-4">
          <h1 className="h4 card-title mb-3" id="register-heading">Create Account</h1>
          <form onSubmit={handleSubmit}>
            <div className="row g-2 mb-2">
              <div className="col-6">
                <label className="form-label mb-1" htmlFor="register-first-name">First name</label>
                <input className="form-control" id="register-first-name" name="firstName" autoComplete="given-name" required />
              </div>
              <div className="col-6">
                <label className="form-label mb-1" htmlFor="register-last-name">Last name</label>
                <input className="form-control" id="register-last-name" name="lastName" autoComplete="family-name" required />
              </div>
            </div>
            <div className="mb-2">
              <label className="form-label mb-1" htmlFor="register-email">Email</label>
              <input className="form-control" id="register-email" name="email" type="email" autoComplete="email" required />
            </div>
            <div className="mb-2">
              <label className="form-label mb-1" htmlFor="register-username">Username</label>
              <input className="form-control" id="register-username" name="login" autoComplete="username" required />
            </div>
            <div className="mb-2">
              <label className="form-label mb-1" htmlFor="register-password">Password</label>
              <input className="form-control" id="register-password" name="password" type="password" autoComplete="new-password" required />
            </div>
            <div className="mb-3">
              <label className="form-label mb-1" htmlFor="register-confirm-password">Confirm password</label>
              <input className="form-control" id="register-confirm-password" name="confirmPassword" type="password" autoComplete="new-password" required />
            </div>
            {error && <div className="alert alert-secondary" role="alert">{error}</div>}
            <button className="btn btn-dark w-100" type="submit" disabled={busy}>{busy ? 'Creating account…' : 'Register'}</button>
          </form>
          <p className="mt-3 mb-0 text-center">Have an account? <Link to="/">Log in</Link></p>
        </div>
      </section>
    </PageLayout>
  )
}
