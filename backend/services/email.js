exports.sendVerificationEmail = async (email, token) => {
  const { RESEND_API_KEY, EMAIL_FROM, APP_BASE_URL } = process.env;
  if (![RESEND_API_KEY, EMAIL_FROM, APP_BASE_URL].every(value => value?.trim())) {
    throw new Error('Resend email configuration is incomplete');
  }
  const base = new URL(APP_BASE_URL);
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(base.hostname);
  if (base.username || base.password || (base.protocol !== 'https:' && !(process.env.NODE_ENV !== 'production' && local && base.protocol === 'http:'))) {
    throw new Error('APP_BASE_URL must use HTTPS, except localhost development');
  }
  const url = new URL('/verify-email', base.origin);
  url.hash = new URLSearchParams({ token }).toString();
  let response;
  try {
    response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      redirect: 'error',
      signal: AbortSignal.timeout(15000),
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY.trim()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: EMAIL_FROM.trim(),
        to: [email],
        subject: 'Verify your Fight Me Bro email',
        text: `Open this link and select Verify email:\n${url.href}\n\nThis link expires in 30 minutes. If you did not request this, ignore this email.`
      })
    });
  } catch {
    throw new Error('Resend request failed or timed out');
  }
  if (!response.ok) throw new Error(`Resend rejected email (HTTP ${response.status})`);
  let result;
  try { result = await response.json(); }
  catch { throw new Error('Resend returned an invalid response'); }
  if (!result || typeof result.id !== 'string' || !result.id.trim()) {
    throw new Error('Resend returned an invalid response');
  }
};
