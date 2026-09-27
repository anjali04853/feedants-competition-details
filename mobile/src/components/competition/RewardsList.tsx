import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import type { Competition } from '@/api/types';
import { Card } from '@/components/ui/Card';
import { Txt } from '@/components/ui/Txt';
import { useI18n } from '@/i18n/LanguageProvider';
import { colors, radius, spacing } from '@/theme';
import { formatMoney, ordinal } from '@/utils/format';

function PositionIcon({ position }: { position: number }) {
  if (position === 1) return <MaterialCommunityIcons name="trophy" size={20} color={colors.gold} />;
  if (position === 2) return <MaterialCommunityIcons name="medal" size={20} color={colors.silver} />;
  if (position === 3) return <MaterialCommunityIcons name="medal" size={20} color={colors.bronze} />;
  return <Ionicons name="star-outline" size={18} color={colors.primaryText} />;
}

export function RewardsList({ rewards }: { rewards: Competition['rewards'] }) {
  const { t, lang } = useI18n();
  if (!rewards.length) return null;
  return (
    <Card style={{ paddingVertical: spacing.md }}>
      <View style={styles.header}>
        <Txt size={14} weight="semibold" accessibilityRole="header">{t('rewards')}</Txt>
        <Txt size={12.5} color={colors.textSecondary}>{t('allPositions')}</Txt>
      </View>
      <View style={{ gap: 3, marginTop: spacing.xs }}>
        {rewards.map((r) => (
          <View key={r.position} style={styles.row}>
            <View style={styles.icon}><PositionIcon position={r.position} /></View>
            <Txt size={13} weight="medium" style={{ flex: 1 }}>{t('winnerLabel', { pos: ordinal(r.position, lang) })}</Txt>
            <Txt size={15} weight="semibold" color={colors.primaryDark}>{formatMoney(r.amount)}</Txt>
          </View>
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: 5,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.primaryTint,
  },
  icon: { width: 22, alignItems: 'center' },
});
