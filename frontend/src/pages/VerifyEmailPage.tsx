import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { verifyEmail, resendVerification } from '../api/emailVerification';
import PageLayout from '../components/PageLayout';

export default function VerifyEmailPage() {
  // The emailed link carries its token after #, so it never reaches a server log.
  const [token] = useState(() => new URLSearchParams(window.location.hash.slice(1)).get('token') || '');
  const [busy, setBusy] = useState(false);
  const [verified, setVerified] = useState(false);
  const [verifyError, setVerifyError] = useState('');
  const [sentTo, setSentTo] = useState('');
  const [resendError, setResendError] = useState('');
  useEffect(() => {
    // Keeps the token out of the address bar and the browser history.
    window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search);
  }, []);

  // Verifying waits for a click, so a mail scanner that opens the link doesn't use it up.
  async function confirm() {
    setBusy(true); setVerifyError('');
    try { await verifyEmail(token); setVerified(true); }
    catch { setVerifyError("That link didn't work."); }
    finally { setBusy(false); }
  }

  async function resend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = String(new FormData(event.currentTarget).get('email') ?? '').trim();
    setBusy(true); setResendError('');
    try { await resendVerification(email); setSentTo(email); }
    catch { setResendError("Couldn't send a link. Try again."); }
    finally { setBusy(false); }
  }

  if (verified) return (
    <PageLayout>
      <section className="card" aria-labelledby="verify-heading">
        <div className="card-body p-4">
          <h1 className="h4 card-title mb-3" id="verify-heading">Email verified</h1>
          <Link className="btn btn-dark w-100" to="/">Log in</Link>
        </div>
      </section>
    </PageLayout>
  );

  if (sentTo) return (
    <PageLayout>
      <section className="card" aria-labelledby="verify-heading">
        <div className="card-body p-4">
          <h1 className="h4 card-title" id="verify-heading">Check your email</h1>
          <p role="status">We sent a new link to <strong>{sentTo}</strong>.</p>
          <Link className="btn btn-dark w-100" to="/">Log in</Link>
        </div>
      </section>
    </PageLayout>
  );

  return (
    <PageLayout>
      <section className="card" aria-labelledby="verify-heading">
        <div className="card-body p-4">
          {token && !verifyError ? <>
            <h1 className="h4 card-title mb-3" id="verify-heading">Verify your email</h1>
            <button className="btn btn-dark w-100" type="button" disabled={busy} onClick={confirm}>{busy ? 'Verifying…' : 'Verify email'}</button>
          </> : <>
            <h1 className="h4 card-title mb-3" id="verify-heading">Send a new link</h1>
            {verifyError && <div className="alert alert-secondary" role="alert">{verifyError}</div>}
            <form onSubmit={resend}>
              <div className="mb-3">
                <label className="form-label" htmlFor="verification-email">Email</label>
                <input className="form-control" id="verification-email" name="email" type="email" autoComplete="email" required />
              </div>
              {resendError && <div className="alert alert-secondary" role="alert">{resendError}</div>}
              <button className="btn btn-dark w-100" type="submit" disabled={busy}>{busy ? 'Sending…' : 'Send a new link'}</button>
            </form>
          </>}
          <p className="mt-3 mb-0 text-center"><Link to="/">Back to log in</Link></p>
        </div>
      </section>
    </PageLayout>
  );
}
