import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, BackHandler, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ApiError, fetchAccount, type LoginResult } from './src/api';
import { clearSession, loadSession, saveSession } from './src/session';
import HomeScreen from './src/screens/HomeScreen';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import VerifyScreen, { type VerifyTarget } from './src/screens/VerifyScreen';
import { colors } from './src/theme';

// The screens a logged out user moves between. A logged in user always sees their account.
type Route = { name: 'login' } | { name: 'register' } | { name: 'verify'; target: VerifyTarget };

export default function App() {
  const [session, setSession] = useState<LoginResult | null>(null);
  const [restoring, setRestoring] = useState(true);
  const [route, setRoute] = useState<Route>({ name: 'login' });

  // Opens straight to the account when the saved login still works.
  useEffect(() => {
    let active = true;
    (async () => {
      const saved = await loadSession();
      if (saved) {
        try {
          const user = await fetchAccount(saved.token, saved.user._id);
          if (active) setSession({ token: saved.token, user });
        } catch (error) {
          // The server refused the token, so log in again; when it can't be reached, keep the saved login.
          if (error instanceof ApiError && error.status !== 0) await clearSession().catch(() => {});
          else if (active) setSession(saved);
        }
      }
      if (active) setRestoring(false);
    })();
    return () => { active = false; };
  }, []);

  // Android's back button returns to the login screen instead of closing the app.
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (session || route.name === 'login') return false;
      setRoute({ name: 'login' });
      return true;
    });
    return () => subscription.remove();
  }, [session, route.name]);

  function handleLogin(result: LoginResult) {
    setSession(result);
    setRoute({ name: 'login' });
    saveSession(result).catch(() => {});
  }

  function handleLogout() {
    setSession(null);
    setRoute({ name: 'login' });
    clearSession().catch(() => {});
  }

  let screen;
  if (restoring) {
    screen = (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.text} accessibilityLabel="Loading" />
      </View>
    );
  } else if (session) {
    screen = <HomeScreen session={session} onLogout={handleLogout} />;
  } else if (route.name === 'register') {
    screen = (
      <RegisterScreen
        onRegistered={target => setRoute({ name: 'verify', target })}
        onShowLogin={() => setRoute({ name: 'login' })}
      />
    );
  } else if (route.name === 'verify') {
    screen = <VerifyScreen target={route.target} onLogin={handleLogin} onBack={() => setRoute({ name: 'login' })} />;
  } else {
    screen = (
      <LoginScreen
        onLogin={handleLogin}
        onUnverified={target => setRoute({ name: 'verify', target })}
        onShowRegister={() => setRoute({ name: 'register' })}
      />
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      {screen}
    </SafeAreaProvider>
  );
}
