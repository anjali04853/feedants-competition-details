import { ComingSoon } from '@/components/ComingSoon';
import { useI18n } from '@/i18n/LanguageProvider';

export default function ExploreScreen() {
  const { t } = useI18n();
  return <ComingSoon title={t('explore')} icon="search-outline" />;
}
