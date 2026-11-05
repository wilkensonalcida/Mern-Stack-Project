import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { verifyEmail, resendVerification } from '../api/emailVerification';
import PageLayout from '../components/PageLayout';

type LinkState = 'verifying' | 'verified' | 'failed';

export default function VerifyEmailPage() {
  // The emailed link carries its token after #, so it never reaches a server log.
  const [token] = useState(() => new URLSearchParams(window.location.hash.slice(1)).get('token') || '');
  const [linkState, setLinkState] = useState<LinkState>('verifying');
  const started = useRef(false);
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState('');
  const [resendError, setResendError] = useState('');

  useEffect(() => {
    // Keeps the token out of the address bar and the browser history.
    window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search);
    // Opening the link verifies right away, and the tab that's waiting on the account then logs in.
    // If a mail scanner opens the link first, the account is still verified, so that tab logs in anyway.
    // A link works only once, so this runs once.
    if (!token || started.current) return;
    started.current = true;
    verifyEmail(token).then(() => setLinkState('verified'), () => setLinkState('failed'));
  }, [token]);

  async function resend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = String(new FormData(event.currentTarget).get('email') ?? '').trim();
    setBusy(true); setResendError('');
    try { await resendVerification(email); setSentTo(email); }
    catch { setResendError("Couldn't send a link. Try again."); }
    finally { setBusy(false); }
  }

  if (token) return (
    <PageLayout>
      <section className="card" aria-labelledby="verify-heading">
        <div className="card-body p-4" role="status">
          {linkState === 'verifying' && (
            <h1 className="h4 card-title mb-0 d-flex align-items-center gap-2" id="verify-heading">
              <span className="spinner-border spinner-border-sm" aria-hidden="true" />
              Verifying your email…
            </h1>
          )}
          {linkState === 'verified' && <>
            <h1 className="h4 card-title" id="verify-heading">Email verified</h1>
            <p>You can close this tab.</p>
            <p className="mb-0 text-body-secondary">Or <Link to="/">log in here</Link>.</p>
          </>}
          {linkState === 'failed' && <>
            <h1 className="h4 card-title" id="verify-heading">That link didn't work</h1>
            <p>It may have expired or already been used.</p>
            <Link className="btn btn-dark w-100" to="/">Log in</Link>
          </>}
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
          <h1 className="h4 card-title mb-3" id="verify-heading">Send a new link</h1>
          <form onSubmit={resend}>
            <div className="mb-3">
              <label className="form-label" htmlFor="verification-email">Email</label>
              <input className="form-control" id="verification-email" name="email" type="email" autoComplete="email" required />
            </div>
            {resendError && <div className="alert alert-secondary" role="alert">{resendError}</div>}
            <button className="btn btn-dark w-100" type="submit" disabled={busy}>{busy ? 'Sending…' : 'Send a new link'}</button>
          </form>
          <p className="mt-3 mb-0 text-center"><Link to="/">Back to log in</Link></p>
        </div>
      </section>
    </PageLayout>
  );
}
