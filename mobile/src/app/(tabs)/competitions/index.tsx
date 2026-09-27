import { SafeAreaView } from 'react-native-safe-area-context';
import { CompetitionList } from '@/components/CompetitionList';
import { ScreenTitle } from '@/components/ScreenTitle';
import { useI18n } from '@/i18n/LanguageProvider';
import { colors } from '@/theme';

export default function CompetitionsScreen() {
  const { t } = useI18n();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <ScreenTitle title={t('competitions')} />
      <CompetitionList />
    </SafeAreaView>
  );
}
