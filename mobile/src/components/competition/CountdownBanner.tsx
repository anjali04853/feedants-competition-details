import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import type { Competition } from '@/api/types';
import { Txt } from '@/components/ui/Txt';
import { useCountdown } from '@/hooks/useCountdown';
import { useI18n } from '@/i18n/LanguageProvider';
import { colors, radius, spacing } from '@/theme';
import { formatCountdown } from '@/utils/format';

/** Isolated so the 1-second tick only re-renders this banner. */
export function CountdownBanner({ competition }: { competition: Competition }) {
  const { t } = useI18n();
  const countdown = competition.countdown;
  const remaining = useCountdown(countdown?.endsAt);

  if (competition.phase === 'cancelled' || competition.phase === 'completed') {
    const cancelled = competition.phase === 'cancelled';
    return (
      <View style={[styles.banner, cancelled && { backgroundColor: colors.dangerSoft }]}>
        <Ionicons name={cancelled ? 'close-circle-outline' : 'ribbon-outline'} size={22} color={cancelled ? colors.danger : colors.primary} />
        <Txt size={13} weight="medium" color={cancelled ? colors.danger : colors.text}>
          {t(cancelled ? 'competitionCancelled' : 'resultsAnnounced')}
        </Txt>
      </View>
    );
  }
  if (!countdown || !remaining) return null;

  return (
    <View style={styles.banner} accessibilityLabel={`${t(`countdown_${countdown.kind}`)} ${formatCountdown(remaining)}`}>
      <MaterialCommunityIcons name="timer-sand" size={22} color={colors.primary} />
      <Txt size={12} weight="medium" style={styles.label} numberOfLines={2}>
        {t(`countdown_${countdown.kind}`)}
      </Txt>
      <Txt size={14.5} weight="semibold" color={colors.primaryText} style={styles.time} numberOfLines={1} adjustsFontSizeToFit>
        {formatCountdown(remaining)}
      </Txt>
      {countdown.urgent && (
        <View style={styles.hurry}>
          <Ionicons name="stopwatch-outline" size={17} color={colors.primaryText} />
          <Txt size={12} weight="semibold" color={colors.primaryText}>{t('hurryUp')}</Txt>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  label: { flexShrink: 1, maxWidth: 88 },
  time: { flex: 1, textAlign: 'center', fontVariant: ['tabular-nums'] },
  hurry: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
