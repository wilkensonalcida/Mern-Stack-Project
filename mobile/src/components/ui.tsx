import type { ReactNode, Ref } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputInstance,
  type TextInputProps,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { API_HOST } from '../api';
import { colors, radius } from '../theme';

// One column that scrolls when the keyboard covers part of it, with the server's name at the bottom.
// Expo draws Android apps edge to edge, so the window no longer shrinks for the keyboard there either,
// and both platforms need the padding.
export function Screen({ children }: { children: ReactNode }) {
  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior="padding">
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.brand} accessibilityRole="header">Fight Me Bro</Text>
          {children}
          <Text style={styles.server}>Server: {API_HOST}</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle} accessibilityRole="header">{title}</Text>
      {subtitle ? <Text style={[styles.muted, styles.subtitle]}>{subtitle}</Text> : null}
      {children}
    </View>
  );
}

type FieldProps = TextInputProps & { label: string; ref?: Ref<TextInputInstance> };

export function Field({ label, style, ref, ...input }: FieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        ref={ref}
        style={[styles.input, style]}
        accessibilityLabel={label}
        placeholderTextColor={colors.muted}
        {...input}
      />
    </View>
  );
}

type ButtonProps = {
  title: string;
  onPress: () => void;
  busy?: boolean;
  disabled?: boolean;
  variant?: 'solid' | 'outline';
};

export function Button({ title, onPress, busy = false, disabled = false, variant = 'solid' }: ButtonProps) {
  const off = disabled || busy;
  const outline = variant === 'outline';
  return (
    <Pressable
      onPress={onPress}
      disabled={off}
      accessibilityRole="button"
      accessibilityState={{ disabled: off, busy }}
      style={({ pressed }) => [
        styles.button,
        outline ? styles.buttonOutline : styles.buttonSolid,
        pressed && styles.pressed,
        off && styles.disabled,
      ]}
    >
      {busy ? <ActivityIndicator size="small" color={outline ? colors.text : colors.onSolid} style={styles.spinner} /> : null}
      <Text style={[styles.buttonText, outline && styles.buttonTextOutline]}>{title}</Text>
    </Pressable>
  );
}

export function TextLink({ title, onPress, disabled = false }: { title: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="link" accessibilityState={{ disabled }} hitSlop={8}>
      <Text style={[styles.link, disabled && styles.linkDisabled]}>{title}</Text>
    </Pressable>
  );
}

export function Notice({ children }: { children: ReactNode }) {
  return (
    <View style={styles.notice} accessibilityRole="alert" accessibilityLiveRegion="polite">
      <Text style={styles.noticeText}>{children}</Text>
    </View>
  );
}

export const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 16, gap: 16 },
  brand: { fontSize: 28, fontWeight: '800', color: colors.text, textAlign: 'center' },
  server: { fontSize: 12, color: colors.muted, textAlign: 'center' },
  card: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius,
    padding: 20,
    gap: 12,
  },
  cardTitle: { fontSize: 20, fontWeight: '600', color: colors.text },
  subtitle: { marginTop: -6 },
  text: { fontSize: 16, color: colors.text, lineHeight: 22 },
  muted: { fontSize: 15, color: colors.muted, lineHeight: 21 },
  strong: { fontWeight: '700' },
  row: { flexDirection: 'row', gap: 12 },
  rowItem: { flex: 1 },
  centerRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  field: { gap: 4 },
  label: { fontSize: 15, color: colors.text },
  input: {
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.card,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    minHeight: 48,
  },
  buttonSolid: { backgroundColor: colors.solid, borderColor: colors.solid },
  buttonOutline: { backgroundColor: 'transparent', borderColor: colors.solid },
  buttonText: { fontSize: 16, fontWeight: '600', color: colors.onSolid },
  buttonTextOutline: { color: colors.text },
  pressed: { opacity: 0.8 },
  disabled: { opacity: 0.6 },
  spinner: { marginRight: 8 },
  link: { fontSize: 16, color: colors.link, textDecorationLine: 'underline' },
  linkDisabled: { color: colors.muted },
  notice: { backgroundColor: colors.noticeBackground, borderRadius: 6, padding: 12 },
  noticeText: { fontSize: 15, color: colors.noticeText, lineHeight: 21 },
});
