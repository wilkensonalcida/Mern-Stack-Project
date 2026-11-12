import { useRef, useState } from 'react';
import { Text, View, type TextInputInstance } from 'react-native';
import { ApiError, login, type LoginResult } from '../api';
import { Button, Card, Field, Notice, Screen, TextLink, styles } from '../components/ui';
import type { VerifyTarget } from './VerifyScreen';

type Props = {
  onLogin: (result: LoginResult) => void;
  onUnverified: (target: VerifyTarget) => void;
  onShowRegister: () => void;
};

export default function LoginScreen({ onLogin, onUnverified, onShowRegister }: Props) {
  const [loginName, setLoginName] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const pending = useRef(false);
  const passwordRef = useRef<TextInputInstance>(null);

  async function submit() {
    if (pending.current) return;
    if (!loginName.trim() || !password) {
      setError('Enter your username and password.');
      return;
    }
    pending.current = true;
    setBusy(true);
    setError('');
    try {
      const result = await login(loginName, password);
      onLogin(result);
    } catch (err) {
      // The password was right but the email isn't verified, so wait for the emailed link instead.
      if (err instanceof ApiError && err.status === 403) onUnverified({ loginName: loginName.trim(), password, emailSent: true });
      else setError(err instanceof Error ? err.message : 'Unable to log in. Please try again.');
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Card title="Log in" subtitle="Log in to your Fight Me Bro account.">
        {error ? <Notice><Text style={styles.strong}>Login failed. </Text>{error}</Notice> : null}
        <Field
          label="Username"
          value={loginName}
          onChangeText={setLoginName}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="username"
          textContentType="username"
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => passwordRef.current?.focus()}
        />
        <Field
          ref={passwordRef}
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="current-password"
          textContentType="password"
          returnKeyType="go"
          onSubmitEditing={submit}
        />
        <Button title={busy ? 'Logging in…' : 'Log in'} busy={busy} onPress={submit} />
        <View style={styles.centerRow}>
          <Text style={styles.muted}>Need an account?</Text>
          <TextLink title="Register" onPress={onShowRegister} />
        </View>
      </Card>
    </Screen>
  );
}
