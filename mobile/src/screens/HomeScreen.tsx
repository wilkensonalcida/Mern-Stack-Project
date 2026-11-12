import { Text, View } from 'react-native';
import type { LoginResult } from '../api';
import { Button, Card, Screen, styles } from '../components/ui';

type Props = {
  session: LoginResult;
  onLogout: () => void;
};

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ gap: 2 }}>
      <Text style={styles.muted}>{label}</Text>
      <Text style={styles.text}>{value}</Text>
    </View>
  );
}

export default function HomeScreen({ session, onLogout }: Props) {
  const { user } = session;
  const name = user.firstName || user.login;
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ');
  return (
    <Screen>
      <Card title={`Wassup, ${name}!`} subtitle="You're logged in. This is your account on the server.">
        <Detail label="Name" value={fullName || 'Not set'} />
        <Detail label="Username" value={user.login} />
        <Detail label="Email" value={user.email || 'Not set'} />
        <Detail label="Email verified" value={user.emailVerified ? 'Yes' : 'No'} />
        <Button title="Log out" variant="outline" onPress={onLogout} />
      </Card>
    </Screen>
  );
}
