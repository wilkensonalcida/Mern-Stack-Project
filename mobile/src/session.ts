import * as SecureStore from 'expo-secure-store';
import type { LoginResult } from './api';

// The login token stays in the phone's encrypted storage (Keychain on iOS, Keystore on Android),
// so the app opens logged in until you log out.
const KEY = 'fightmebro.session';

export async function loadSession(): Promise<LoginResult | null> {
  try {
    const saved = await SecureStore.getItemAsync(KEY);
    if (!saved) return null;
    const session: unknown = JSON.parse(saved);
    if (
      typeof session === 'object' && session !== null &&
      'token' in session && typeof session.token === 'string' &&
      'user' in session && typeof session.user === 'object' && session.user !== null &&
      '_id' in session.user && typeof session.user._id === 'string'
    ) {
      return session as LoginResult;
    }
    return null;
  } catch {
    return null;
  }
}

export async function saveSession(session: LoginResult): Promise<void> {
  await SecureStore.setItemAsync(KEY, JSON.stringify(session));
}

export async function clearSession(): Promise<void> {
  await SecureStore.deleteItemAsync(KEY);
}
