import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { SegmentedToggle } from '@/components/ui/SegmentedToggle';
import { Txt } from '@/components/ui/Txt';
import { useI18n } from '@/i18n/LanguageProvider';
import type { Lang } from '@/i18n/strings';
import { colors, spacing } from '@/theme';

export function DetailsHeader() {
  const { t, lang, setLang } = useI18n();
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/competitions'));

  return (
    <View style={styles.row}>
      <Pressable onPress={goBack} style={styles.back} accessibilityRole="button" accessibilityLabel={t('goBack')} hitSlop={8}>
        <Ionicons name="arrow-back" size={22} color={colors.text} />
        <Txt size={16} weight="medium">{t('goBack')}</Txt>
      </Pressable>
      <SegmentedToggle<Lang>
        value={lang}
        onChange={setLang}
        options={[
          { value: 'en', label: 'ENG' },
          { value: 'hi', label: 'हिंदी' },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.background,
  },
  back: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
});
