async function post(path: string, body: object): Promise<{ message: string }> {
  const response = await fetch(`/api/auth/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  let data: { message?: string; error?: string };
  try { data = await response.json(); }
  catch { throw new Error('The server returned an unexpected response. Please try again.'); }
  if (!response.ok) throw new Error(data.error || 'Request failed. Please try again.');
  return { message: data.message || 'Request completed.' };
}
export function verifyEmail(token: string) { return post('verify-email', { token }); }
export function resendVerification(email: string) { return post('resend-verification', { email }); }
