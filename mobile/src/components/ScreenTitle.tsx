import { StyleSheet, View } from 'react-native';
import { SegmentedToggle } from '@/components/ui/SegmentedToggle';
import { Txt } from '@/components/ui/Txt';
import { useI18n } from '@/i18n/LanguageProvider';
import type { Lang } from '@/i18n/strings';
import { spacing } from '@/theme';

export function ScreenTitle({ title }: { title: string }) {
  const { lang, setLang } = useI18n();
  return (
    <View style={styles.row}>
      <Txt size={22} weight="bold" accessibilityRole="header">{title}</Txt>
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
    paddingTop: spacing.sm,
  },
});
