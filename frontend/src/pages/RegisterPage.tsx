import { useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { register, type SignupResult } from '../api/auth'
import PageLayout from '../components/PageLayout'

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
  if (result) {
    const sent = result.emailVerification.delivery === 'sent'
    return (
      <PageLayout>
        <section className="card" aria-labelledby="register-heading">
          <div className="card-body p-4">
            <h1 className="h4 card-title" id="register-heading">{sent ? 'Check your email' : 'Account created'}</h1>
            <p role="status">
              {sent
                ? <>We sent a verification link to <strong>{result.user.email ?? 'your email'}</strong>.</>
                : "We couldn't send your verification email."}
            </p>
            <Link className="btn btn-dark w-100" to="/">Log in</Link>
            <p className="mt-3 mb-0 text-center">No email? <Link to="/verify-email">Send a new link</Link></p>
          </div>
        </section>
      </PageLayout>
    )
  }

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
