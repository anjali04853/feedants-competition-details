import { StyleSheet, View } from 'react-native';
import { colors } from '@/theme';

export function ProgressBar({ value, color = colors.primary }: { value: number; color?: string }) {
  const pct = Math.min(1, Math.max(0, value));
  return (
    <View
      style={styles.track}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(pct * 100) }}
    >
      {/* Always show a sliver so a single booking is visible, as in the design. */}
      <View style={[styles.fill, { width: `${pct === 0 ? 0 : Math.max(pct * 100, 6)}%`, backgroundColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { height: 4, borderRadius: 2, backgroundColor: colors.track, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 2 },
});
