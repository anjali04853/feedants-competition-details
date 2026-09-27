import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors, radius, spacing } from '@/theme';
import { Txt } from './Txt';

export function ErrorView({ message, onRetry, retryLabel }: { message: string; onRetry?: () => void; retryLabel?: string }) {
  return (
    <View style={styles.wrap}>
      <Ionicons name="cloud-offline-outline" size={40} color={colors.textMuted} />
      <Txt size={14} align="center" color={colors.textSecondary} style={{ marginTop: spacing.md }}>
        {message}
      </Txt>
      {onRetry && (
        <Pressable onPress={onRetry} style={styles.button} accessibilityRole="button">
          <Txt weight="semibold" color={colors.white}>{retryLabel ?? 'Retry'}</Txt>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xxl },
  button: {
    marginTop: spacing.lg,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.md,
  },
});
