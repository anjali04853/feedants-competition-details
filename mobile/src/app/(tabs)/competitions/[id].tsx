import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ApiError } from '@/api/client';
import { useCompetition, useInvalidateCompetition, useRefetchAtTransitions, useViewerState } from '@/api/queries';
import { ActionBar } from '@/components/competition/ActionBar';
import { CountdownBanner } from '@/components/competition/CountdownBanner';
import { DetailsHeader } from '@/components/competition/DetailsHeader';
import { ImportantDates } from '@/components/competition/ImportantDates';
import { AdSlot, Disclaimer, TestimonialsLink, TrustRow } from '@/components/competition/InfoRows';
import { InfoTabs } from '@/components/competition/InfoTabs';
import { JudgeCard } from '@/components/competition/JudgeCard';
import { PreviousWinners } from '@/components/competition/PreviousWinners';
import { ReferCard } from '@/components/competition/ReferCard';
import { RewardsList } from '@/components/competition/RewardsList';
import { SummaryCard } from '@/components/competition/SummaryCard';
import { ErrorView } from '@/components/ui/ErrorView';
import { CompetitionSkeleton } from '@/components/ui/Skeleton';
import { useI18n } from '@/i18n/LanguageProvider';
import { colors, spacing } from '@/theme';

export default function CompetitionDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useI18n();
  const competition = useCompetition(id);
  const viewer = useViewerState(id);
  const invalidate = useInvalidateCompetition(id);
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = async () => {
    setRefreshing(true);
    await invalidate().finally(() => setRefreshing(false));
  };
  useRefetchAtTransitions(id, competition.data?.nextTransitionAt, viewer.data?.nextTransitionAt);

  const c = competition.data;

  let body: React.ReactNode;
  if (!c && competition.isPending) {
    body = <CompetitionSkeleton />;
  } else if (!c) {
    const notFound = competition.error instanceof ApiError && competition.error.status === 404;
    body = (
      <ErrorView
        message={notFound ? t('notFound') : t('networkError')}
        onRetry={notFound ? undefined : () => competition.refetch()}
        retryLabel={t('retry')}
      />
    );
  } else {
    body = (
      <>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
        >
          <SummaryCard competition={c} viewerStatus={viewer.data?.status} />
          <JudgeCard judge={c.judge} />
          <CountdownBanner competition={c} />
          <ImportantDates schedule={c.schedule} />
          <PreviousWinners winners={c.previousWinners} />
          <InfoTabs competition={c} />
          <RewardsList rewards={c.rewards} />
          <Disclaimer text={c.disclaimer} />
          <TrustRow prizeInfoVideoUrl={c.prizeInfoVideoUrl} />
          <ReferCard referral={viewer.data?.referral} />
          <TestimonialsLink />
          <AdSlot />
        </ScrollView>
        <ActionBar competition={c} viewer={viewer.data} />
      </>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <DetailsHeader />
      <View style={{ flex: 1 }}>{body}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.xs, paddingBottom: spacing.lg, gap: spacing.md, maxWidth: 720, width: '100%', alignSelf: 'center' },
});
