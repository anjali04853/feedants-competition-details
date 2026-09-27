import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Txt } from '@/components/ui/Txt';
import { useI18n } from '@/i18n/LanguageProvider';
import { colors, spacing } from '@/theme';

/** Placeholder for tabs outside the scope of this assignment. */
export function ComingSoon({ title, icon }: { title: string; icon: keyof typeof Ionicons.glyphMap }) {
  const { t } = useI18n();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm }}>
        <Ionicons name={icon} size={44} color={colors.primary} />
        <Txt size={18} weight="semibold">{title}</Txt>
        <Txt color={colors.textMuted}>{t('comingSoon')}</Txt>
      </View>
    </SafeAreaView>
  );
}
