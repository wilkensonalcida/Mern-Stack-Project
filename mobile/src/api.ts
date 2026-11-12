// Talks to the Fight Me Bro API.
// The app uses the live server unless EXPO_PUBLIC_API_URL names another one, such as a local API.
export const API_URL = (process.env.EXPO_PUBLIC_API_URL || 'https://mern.alex84plus.xyz/api').replace(/\/+$/, '');

// The server's host name, shown on every screen so a demo makes clear which server the app talks to.
export const API_HOST = API_URL.replace(/^https?:\/\//, '').split('/')[0];

const TIMEOUT_MS = 15000;

export type User = {
  _id: string;
  login: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  emailVerified?: boolean;
};
export type LoginResult = { token: string; user: User };
export type SignupInput = { firstName: string; lastName: string; login: string; email: string; password: string };
export type SignupResult = { user: User; emailSent: boolean };

// A status of 0 means the server never answered.
export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

type Json = Record<string, unknown>;

function isRecord(value: unknown): value is Json {
  return typeof value === 'object' && value !== null;
}

function isUser(value: unknown): value is User {
  return isRecord(value) && typeof value._id === 'string' && typeof value.login === 'string';
}

async function request(path: string, options: { body?: object; token?: string } = {}): Promise<Json> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let response: Response;
  let data: unknown;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method: options.body ? 'POST' : 'GET',
      headers: {
        Accept: 'application/json',
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });
    data = await response.json().catch(() => null);
  } catch {
    throw new ApiError(0, "Can't reach the server. Check your connection and try again.");
  } finally {
    clearTimeout(timer);
  }
  if (!response.ok) {
    const message = isRecord(data) && typeof data.error === 'string' ? data.error : 'Something went wrong. Please try again.';
    throw new ApiError(response.status, message);
  }
  if (!isRecord(data)) throw new ApiError(502, 'The server sent an unexpected response. Please try again.');
  return data;
}

export async function login(loginName: string, password: string): Promise<LoginResult> {
  const data = await request('/auth/login', { body: { login: loginName.trim(), password } });
  if (typeof data.token !== 'string' || !data.token || !isUser(data.user)) {
    throw new ApiError(502, 'The server sent an unexpected login response.');
  }
  return { token: data.token, user: data.user };
}

export async function register(input: SignupInput): Promise<SignupResult> {
  const data = await request('/users', { body: input });
  const verification = data.emailVerification;
  if (!isUser(data.user) || !isRecord(verification) || typeof verification.delivery !== 'string') {
    throw new ApiError(502, 'The server sent an unexpected signup response.');
  }
  return { user: data.user, emailSent: verification.delivery === 'sent' };
}

// The server answers the same way whether or not the email belongs to an unverified account,
// so this returns its message instead of claiming that an email went out.
export async function resendVerification(email: string): Promise<string> {
  const data = await request('/auth/resend-verification', { body: { email: email.trim() } });
  return typeof data.message === 'string' ? data.message : 'Request received.';
}

// Fetches the logged in user's own account, which also proves that a saved token still works.
export async function fetchAccount(token: string, userId: string): Promise<User> {
  const data = await request(`/users/${encodeURIComponent(userId)}`, { token });
  if (!isUser(data)) throw new ApiError(502, 'The server sent an unexpected account response.');
  return data;
}

// The same check the API runs before it resends a verification email.
export const EMAIL_PATTERN = /^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/;
