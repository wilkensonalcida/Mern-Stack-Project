import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Text, View } from 'react-native';
import { ApiError, EMAIL_PATTERN, login, resendVerification, type LoginResult } from '../api';
import { Button, Card, Field, Notice, Screen, TextLink, styles } from '../components/ui';
import { colors } from '../theme';

const CHECK_EVERY_MS = 4000;
// The emailed link stops working after 30 minutes.
const LINK_LIFETIME_MS = 30 * 60 * 1000;
// The server sends at most one link a minute.
const RESEND_WAIT_MS = 60 * 1000;

export type VerifyTarget = {
  loginName: string;
  // Kept only in memory, to log in again once the email is verified.
  password: string;
  // Known right after Register, but not after a login that was refused for an unverified email.
  email?: string;
  emailSent: boolean;
};

type Props = {
  target: VerifyTarget;
  onLogin: (result: LoginResult) => void;
  onBack: () => void;
};

// Waits on a new account until its owner clicks the emailed link, then logs them in.
// Login answers 403 until the email is verified, so retrying it tells when that happened.
export default function VerifyScreen({ target, onLogin, onBack }: Props) {
  const [sent, setSent] = useState(target.emailSent);
  const [email, setEmail] = useState(target.email ?? '');
  const [expiresAt, setExpiresAt] = useState(() => Date.now() + LINK_LIFETIME_MS);
  const [expired, setExpired] = useState(false);
  const [failed, setFailed] = useState('');
  const [notice, setNotice] = useState('');
  const [resending, setResending] = useState(false);
  const [resendBlocked, setResendBlocked] = useState(false);
  const onLoginRef = useRef(onLogin);
  const resendTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => { onLoginRef.current = onLogin; }, [onLogin]);
  useEffect(() => () => clearTimeout(resendTimer.current), []);

  useEffect(() => {
    if (expired || failed) return;
    let active = true;
    let checking = false;
    async function check() {
      if (!active || checking || AppState.currentState !== 'active') return;
      if (Date.now() > expiresAt) {
        setExpired(true);
        return;
      }
      checking = true;
      try {
        const result = await login(target.loginName, target.password);
        if (active) onLoginRef.current(result);
      } catch (error) {
        // 403 means the email isn't verified yet, and 0 means the server didn't answer, so both keep waiting.
        if (active && error instanceof ApiError && error.status !== 403 && error.status !== 0) setFailed(error.message);
      } finally {
        checking = false;
      }
    }
    const timer = setInterval(check, CHECK_EVERY_MS);
    // Checking the moment the app is back in view logs you in right after you click the link in your email.
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') check();
    });
    return () => {
      active = false;
      clearInterval(timer);
      subscription.remove();
    };
  }, [target.loginName, target.password, expiresAt, expired, failed]);

  async function resend() {
    const address = email.trim();
    if (!EMAIL_PATTERN.test(address)) {
      setNotice('Enter the email you registered with.');
      return;
    }
    setResending(true);
    setNotice('');
    try {
      setNotice(await resendVerification(address));
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Couldn't send a link. Try again.");
      setResending(false);
      return;
    }
    setResending(false);
    setSent(true);
    setExpiresAt(Date.now() + LINK_LIFETIME_MS);
    setExpired(false);
    setResendBlocked(true);
    resendTimer.current = setTimeout(() => setResendBlocked(false), RESEND_WAIT_MS);
  }

  return (
    <Screen>
      <Card title="Check your email">
        <Text style={styles.text}>
          {!target.email
            ? "Your email isn't verified yet. Click the link in your verification email."
            : sent
              ? <>Click the link we sent to <Text style={styles.strong}>{target.email}</Text>.</>
              : <>Your account was created, but we couldn't email <Text style={styles.strong}>{target.email}</Text> yet. Resend the link below.</>}
        </Text>
        {failed ? <Notice>{failed}</Notice> : null}
        {expired ? <Notice>Your link expired. Send a new one.</Notice> : null}
        {!failed && !expired ? (
          <View style={styles.centerRow} accessibilityLiveRegion="polite">
            <ActivityIndicator size="small" color={colors.muted} />
            <Text style={styles.muted}>You'll be logged in here as soon as it's verified.</Text>
          </View>
        ) : null}
        {target.email ? (
          <View style={styles.centerRow}>
            <Text style={styles.muted}>Didn't get it?</Text>
            <TextLink title={resending ? 'Sending…' : 'Resend link'} onPress={resend} disabled={resending || resendBlocked} />
          </View>
        ) : (
          <>
            <Field
              label="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              textContentType="emailAddress"
              returnKeyType="send"
              onSubmitEditing={resend}
            />
            <Button title="Send a new link" variant="outline" busy={resending} disabled={resendBlocked} onPress={resend} />
          </>
        )}
        {notice ? <Text style={styles.muted} accessibilityLiveRegion="polite">{notice}</Text> : null}
        <View style={styles.centerRow}>
          <TextLink title="Back to log in" onPress={onBack} />
        </View>
      </Card>
    </Screen>
  );
}
