import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import type { Competition, ViewerState } from '@/api/types';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Txt } from '@/components/ui/Txt';
import { useI18n } from '@/i18n/LanguageProvider';
import { colors, radius, spacing } from '@/theme';
import { formatMoney } from '@/utils/format';

function StatusBadge({ status }: { status: ViewerState['status'] | undefined }) {
  const { t } = useI18n();
  if (status === 'registered') {
    return (
      <View style={[styles.badge, { backgroundColor: colors.primarySoft }]}>
        <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
        <Txt size={12} weight="medium" color={colors.primaryText}>{t('registered')}</Txt>
      </View>
    );
  }
  if (status === 'payment_pending') {
    return (
      <View style={[styles.badge, { backgroundColor: colors.warningSoft }]}>
        <Ionicons name="time" size={15} color={colors.warning} />
        <Txt size={12} weight="medium" color={colors.warning}>{t('paymentPending')}</Txt>
      </View>
    );
  }
  return null;
}

/** `acceptingRegistrations` is false once registration has closed (or the competition was cancelled). */
export function SpotsIndicator({ spots, acceptingRegistrations = true }: { spots: Competition['spots']; acceptingRegistrations?: boolean }) {
  const { t } = useI18n();
  const { remaining, capacity, booked } = spots;
  const label =
    !acceptingRegistrations ? t('cta_registration_closed')
      : remaining === 0 ? t('soldOut')
      : remaining === 1 ? t('oneSpotLeft')
      : remaining <= Math.max(20, capacity * 0.25) ? t('onlySpotsLeft', { n: remaining })
      : t('spotsLeft', { n: remaining });
  const tone = !acceptingRegistrations ? colors.textMuted : remaining === 0 ? colors.danger : colors.primaryText;

  return (
    <View style={styles.spots} accessibilityLabel={`${label}. ${t('booked', { booked, capacity })}`}>
      <View style={styles.inline}>
        <Ionicons name="people-outline" size={16} color={tone} />
        <Txt size={13} weight="medium" color={tone}>{label}</Txt>
      </View>
      <View style={{ marginVertical: 7 }}>
        <ProgressBar value={booked / capacity} color={tone === colors.primaryText ? colors.primary : tone} />
      </View>
      <Txt size={11} color={colors.textMuted}>{t('booked', { booked, capacity })}</Txt>
    </View>
  );
}

export function SummaryCard({ competition, viewerStatus }: { competition: Competition; viewerStatus?: ViewerState['status'] }) {
  const { t } = useI18n();
  const c = competition;
  return (
    <Card style={{ paddingBottom: spacing.md }}>
      <View style={styles.titleRow}>
        <Txt size={19} weight="bold" style={{ flex: 1 }} accessibilityRole="header">{c.title}</Txt>
        <StatusBadge status={viewerStatus} />
      </View>

      <View style={[styles.inline, { flexWrap: 'wrap', marginTop: spacing.sm, gap: spacing.sm }]}>
        {c.tags.map((tag) => <Chip key={tag} label={tag} />)}
        {c.certificateForWinners && (
          <View style={[styles.inline, { marginLeft: spacing.xs }]}>
            <MaterialCommunityIcons name="trophy-outline" size={16} color={colors.primaryText} />
            <Txt size={12} weight="medium" color={colors.primaryText}>{t('winnersGetCertificate')}</Txt>
          </View>
        )}
      </View>

      <View style={styles.statsRow}>
        <View style={{ flex: 1.05 }}>
          <Txt size={12} color={colors.textSecondary}>{t('prizePool')}</Txt>
          <Txt size={24} weight="bold" color={colors.primaryDark}>{formatMoney(c.prizePool)}</Txt>
        </View>
        <View style={{ flex: 0.95 }}>
          <Txt size={12} color={colors.textSecondary}>{t('entryFee')}</Txt>
          <Txt size={24} weight="bold">{c.entryFee === 0 ? t('free') : formatMoney(c.entryFee)}</Txt>
        </View>
        <SpotsIndicator spots={c.spots} acceptingRegistrations={c.phase === 'upcoming' || c.phase === 'registration_open'} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  statsRow: { flexDirection: 'row', alignItems: 'flex-end', marginTop: spacing.md },
  spots: { flex: 1.3, paddingBottom: 2 },
});
