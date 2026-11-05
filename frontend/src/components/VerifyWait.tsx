import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { AuthError, login, type LoginResult } from '../api/auth'
import { resendVerification } from '../api/emailVerification'

const CHECK_EVERY_MS = 4000
// The emailed link stops working after 30 minutes.
const LINK_LIFETIME_MS = 30 * 60 * 1000
// The server sends at most one link a minute.
const RESEND_WAIT_MS = 60 * 1000

type VerifyWaitProps = {
  loginName: string
  // Kept only in memory, to log in again once the email is verified.
  password: string
  remember: boolean
  // Known right after Register, but not after a login that was refused for an unverified email.
  email?: string
  emailSent?: boolean
  onLogin: (result: LoginResult, remember: boolean) => void
}

// Waits on a new account until its owner clicks the emailed link, then logs them in.
// Login answers 403 until the email is verified, so retrying it tells when that happened.
export default function VerifyWait({ loginName, password, remember, email, emailSent = true, onLogin }: VerifyWaitProps) {
  const [sent, setSent] = useState(emailSent)
  const [expiresAt, setExpiresAt] = useState(() => Date.now() + LINK_LIFETIME_MS)
  const [expired, setExpired] = useState(false)
  const [failed, setFailed] = useState('')
  const [notice, setNotice] = useState('')
  const [resendBlocked, setResendBlocked] = useState(false)
  const onLoginRef = useRef(onLogin)
  const resendTimer = useRef(0)

  useEffect(() => { onLoginRef.current = onLogin }, [onLogin])
  useEffect(() => () => window.clearTimeout(resendTimer.current), [])

  useEffect(() => {
    if (expired || failed) return
    let active = true
    let checking = false
    async function check() {
      if (!active || checking || document.visibilityState !== 'visible') return
      if (Date.now() > expiresAt) { setExpired(true); return }
      checking = true
      let result: LoginResult
      try {
        result = await login(loginName, password)
      } catch (error) {
        // 403 means the email isn't verified yet, and 0 means the server didn't answer, so both keep waiting.
        if (active && error instanceof AuthError && error.status !== 403 && error.status !== 0) setFailed(error.message)
        return
      } finally {
        checking = false
      }
      if (!active) return
      try { onLoginRef.current(result, remember) }
      catch (error) { setFailed(error instanceof Error ? error.message : 'Unable to log in. Please try again.') }
    }
    const timer = window.setInterval(check, CHECK_EVERY_MS)
    // Checking the moment this tab is back in view logs you in right after you click the link elsewhere.
    document.addEventListener('visibilitychange', check)
    window.addEventListener('focus', check)
    return () => {
      active = false
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', check)
      window.removeEventListener('focus', check)
    }
  }, [loginName, password, remember, expiresAt, expired, failed])

  async function resend() {
    if (!email) return
    setResendBlocked(true)
    setNotice('')
    try {
      await resendVerification(email)
    } catch {
      setNotice("Couldn't send a link. Try again.")
      setResendBlocked(false)
      return
    }
    setSent(true)
    setNotice('Sent a new link.')
    setExpiresAt(Date.now() + LINK_LIFETIME_MS)
    setExpired(false)
    resendTimer.current = window.setTimeout(() => setResendBlocked(false), RESEND_WAIT_MS)
  }

  return (
    <section className="card" aria-labelledby="wait-heading">
      <div className="card-body p-4">
        <h1 className="h4 card-title" id="wait-heading">Check your email</h1>
        <p>
          {!email ? 'Click the link in your verification email.'
            : sent ? <>Click the link we sent to <strong>{email}</strong></>
            : <>We couldn't email <strong>{email}</strong> yet. Try resending.</>}
        </p>
        {failed && <div className="alert alert-secondary" role="alert">{failed}</div>}
        {expired && sent && <p role="status">Your link expired.</p>}
        <p className="mb-0">
          Didn't get it?{' '}
          {email
            ? <button className="btn btn-link p-0 align-baseline" type="button" disabled={resendBlocked} onClick={resend}>Resend link</button>
            : <Link to="/verify-email">Send a new link</Link>}
          {notice && <span className="text-body-secondary" role="status"> {notice}</span>}
        </p>
      </div>
    </section>
  )
}
