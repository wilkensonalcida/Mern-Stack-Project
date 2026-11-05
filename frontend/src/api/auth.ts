export type User = { _id: string; login: string; firstName?: string; lastName?: string; email?: string; emailVerified?: boolean };
export type LoginResult = { token: string; user: User };
export type SignupInput = { firstName: string; lastName: string; login: string; password: string; email: string };
export type SignupResult = { message: string; user: User; emailVerification: { delivery: string; message: string } };
export class AuthError extends Error {
  constructor(public status: number, message: string) { super(message); this.name = 'AuthError'; }
}
function record(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null; }
function isLoginResult(value: unknown): value is LoginResult {
  return record(value) && typeof value.token === 'string' && value.token.length > 0 && record(value.user)
    && typeof value.user._id === 'string' && typeof value.user.login === 'string';
}
async function post(path: string, body: object): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
    });
  } catch { throw new AuthError(0, 'Unable to reach the server. Please try again.'); }
  let data: unknown;
  try { data = await response.json(); }
  catch { throw new AuthError(response.status, 'The server returned an unexpected response. Please try again.'); }
  if (!response.ok) throw new AuthError(response.status, record(data) && typeof data.error === 'string' ? data.error : 'Request failed. Please try again.');
  return data;
}
export async function login(loginName: string, password: string): Promise<LoginResult> {
  const data = await post('/auth/login', { login: loginName, password });
  if (!isLoginResult(data)) throw new AuthError(502, 'The server returned an unexpected login response.');
  return data;
}
export async function register(input: SignupInput): Promise<SignupResult> {
  const data = await post('/users', input);
  if (!record(data) || typeof data.message !== 'string' || !record(data.user)
      || !record(data.emailVerification) || typeof data.emailVerification.message !== 'string'
      || typeof data.emailVerification.delivery !== 'string') throw new AuthError(502, 'The server returned an unexpected signup response.');
  return data as SignupResult;
}
