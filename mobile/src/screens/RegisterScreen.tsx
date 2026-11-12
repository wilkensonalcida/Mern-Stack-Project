import { useRef, useState } from 'react';
import { Text, View, type TextInputInstance } from 'react-native';
import { EMAIL_PATTERN, register } from '../api';
import { Button, Card, Field, Notice, Screen, TextLink, styles } from '../components/ui';
import type { VerifyTarget } from './VerifyScreen';

type Props = {
  onRegistered: (target: VerifyTarget) => void;
  onShowLogin: () => void;
};

export default function RegisterScreen({ onRegistered, onShowLogin }: Props) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [loginName, setLoginName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const pending = useRef(false);
  const lastNameRef = useRef<TextInputInstance>(null);
  const emailRef = useRef<TextInputInstance>(null);
  const loginRef = useRef<TextInputInstance>(null);
  const passwordRef = useRef<TextInputInstance>(null);
  const confirmRef = useRef<TextInputInstance>(null);

  function problem(): string {
    if (![firstName, lastName, email, loginName].every(value => value.trim()) || !password) return 'Fill in every field.';
    if (!EMAIL_PATTERN.test(email.trim())) return 'Enter a valid email address.';
    if (password !== confirmPassword) return 'Passwords do not match.';
    return '';
  }

  async function submit() {
    if (pending.current) return;
    const invalid = problem();
    setError(invalid);
    if (invalid) return;
    pending.current = true;
    setBusy(true);
    try {
      const result = await register({ firstName, lastName, email, login: loginName, password });
      // Waits on the next screen until the emailed link is clicked, then logs in without asking again.
      onRegistered({
        loginName: loginName.trim(),
        password,
        email: result.user.email || email.trim().toLowerCase(),
        emailSent: result.emailSent,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to register. Please try again.');
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Card title="Create account" subtitle="We'll email you a link to verify your address.">
        <View style={styles.row}>
          <View style={styles.rowItem}>
            <Field
              label="First name"
              value={firstName}
              onChangeText={setFirstName}
              autoComplete="given-name"
              textContentType="givenName"
              returnKeyType="next"
              submitBehavior="submit"
              onSubmitEditing={() => lastNameRef.current?.focus()}
            />
          </View>
          <View style={styles.rowItem}>
            <Field
              ref={lastNameRef}
              label="Last name"
              value={lastName}
              onChangeText={setLastName}
              autoComplete="family-name"
              textContentType="familyName"
              returnKeyType="next"
              submitBehavior="submit"
              onSubmitEditing={() => emailRef.current?.focus()}
            />
          </View>
        </View>
        <Field
          ref={emailRef}
          label="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType="emailAddress"
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => loginRef.current?.focus()}
        />
        <Field
          ref={loginRef}
          label="Username"
          value={loginName}
          onChangeText={setLoginName}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="username-new"
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
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => confirmRef.current?.focus()}
        />
        <Field
          ref={confirmRef}
          label="Confirm password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="go"
          onSubmitEditing={submit}
        />
        {error ? <Notice>{error}</Notice> : null}
        <Button title={busy ? 'Creating account…' : 'Register'} busy={busy} onPress={submit} />
        <View style={styles.centerRow}>
          <Text style={styles.muted}>Have an account?</Text>
          <TextLink title="Log in" onPress={onShowLogin} />
        </View>
      </Card>
    </Screen>
  );
}
