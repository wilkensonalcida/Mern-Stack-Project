import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { verifyEmail, resendVerification } from '../api/emailVerification';

export default function VerifyEmailPage() {
  const [token] = useState(() => new URLSearchParams(window.location.hash.slice(1)).get('token') || '');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [verified, setVerified] = useState(false);
  useEffect(() => {
    window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search);
  }, []);
  async function confirm() {
    setBusy(true); setMessage('');
    try { setMessage((await verifyEmail(token)).message); setVerified(true); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to verify email.'); }
    finally { setBusy(false); }
  }
  async function resend(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage('');
    try { setMessage((await resendVerification(email)).message); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to request email.'); }
    finally { setBusy(false); }
  }
  return (
    <main>
      <h1>Verify your email</h1>
      {token && !verified && <>
        <p>Select the button to confirm your email address.</p>
        <button type="button" disabled={busy} onClick={confirm}>Verify email</button>
      </>}
      {!token && <p>Open the link in your verification email, or request a new email below.</p>}
      {message && <p role="status">{message}</p>}
      {!verified && <form onSubmit={resend}>
        <h2>Request another verification email</h2>
        <label htmlFor="verification-email">Email address</label>
        <input id="verification-email" type="email" autoComplete="email" required value={email} onChange={event => setEmail(event.target.value)} />
        <button type="submit" disabled={busy}>Resend verification email</button>
        <p>Links expire after 30 minutes. Wait at least 60 seconds between requests and use the newest email.</p>
      </form>}
      <p><Link to="/login">Go to login</Link></p>
    </main>
  );
}
