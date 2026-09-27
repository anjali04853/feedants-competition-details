import { router } from 'expo-router';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { useCompetitions } from '@/api/queries';
import type { CompetitionSummary, Phase } from '@/api/types';
import { SpotsIndicator } from '@/components/competition/SummaryCard';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { ErrorView } from '@/components/ui/ErrorView';
import { SkeletonBlock } from '@/components/ui/Skeleton';
import { Txt } from '@/components/ui/Txt';
import { useI18n } from '@/i18n/LanguageProvider';
import { colors, radius, spacing } from '@/theme';
import { formatMoney } from '@/utils/format';

const PHASE_COLOR: Record<Phase, { bg: string; fg: string }> = {
  registration_open: { bg: colors.primarySoft, fg: colors.primaryText },
  upcoming: { bg: '#EEF2FF', fg: '#4338CA' },
  in_progress: { bg: colors.warningSoft, fg: colors.warning },
  judging: { bg: colors.warningSoft, fg: colors.warning },
  completed: { bg: colors.chip, fg: colors.textSecondary },
  cancelled: { bg: colors.dangerSoft, fg: colors.danger },
};

function CompetitionRow({ item }: { item: CompetitionSummary }) {
  const { t } = useI18n();
  const tone = PHASE_COLOR[item.phase];
  return (
    <Pressable onPress={() => router.push(`/competitions/${item.slug}`)} accessibilityRole="button">
      <Card>
        <View style={styles.titleRow}>
          <Txt size={16} weight="semibold" style={{ flex: 1 }}>{item.title}</Txt>
          <View style={[styles.phase, { backgroundColor: tone.bg }]}>
            <Txt size={11} weight="semibold" color={tone.fg}>{t(`phase_${item.phase}`)}</Txt>
          </View>
        </View>
        <View style={styles.tags}>{item.tags.map((tag) => <Chip key={tag} label={tag} />)}</View>
        <View style={styles.stats}>
          <View style={{ flex: 1 }}>
            <Txt size={11} color={colors.textMuted}>{t('prizePool')}</Txt>
            <Txt size={17} weight="bold" color={colors.primaryDark}>{formatMoney(item.prizePool)}</Txt>
          </View>
          <View style={{ flex: 1 }}>
            <Txt size={11} color={colors.textMuted}>{t('entryFee')}</Txt>
            <Txt size={17} weight="bold">{item.entryFee ? formatMoney(item.entryFee) : t('free')}</Txt>
          </View>
          <SpotsIndicator spots={item.spots} acceptingRegistrations={item.phase === 'upcoming' || item.phase === 'registration_open'} />
        </View>
      </Card>
    </Pressable>
  );
}

export function CompetitionList({ header }: { header?: React.ReactElement }) {
  const { t } = useI18n();
  const { data, isPending, error, refetch, isRefetching } = useCompetitions();

  if (isPending) {
    return (
      <View style={{ padding: spacing.lg, gap: spacing.md }}>
        {header}
        {[0, 1, 2].map((i) => <SkeletonBlock key={i} height={130} style={{ borderRadius: radius.lg }} />)}
      </View>
    );
  }
  if (error && !data) return <ErrorView message={t('networkError')} onRetry={refetch} retryLabel={t('retry')} />;

  return (
    <FlatList
      data={data}
      keyExtractor={(c) => c.id}
      renderItem={({ item }) => <CompetitionRow item={item} />}
      ListHeaderComponent={header}
      contentContainerStyle={{ padding: spacing.lg, gap: spacing.md, maxWidth: 720, width: '100%', alignSelf: 'center' }}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
    />
  );
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  phase: { borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 3 },
  tags: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  stats: { flexDirection: 'row', alignItems: 'flex-end', marginTop: spacing.md, gap: spacing.sm },
});
