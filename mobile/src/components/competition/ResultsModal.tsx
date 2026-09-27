import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import type { Competition } from '@/api/types';
import { Txt } from '@/components/ui/Txt';
import { useI18n } from '@/i18n/LanguageProvider';
import { colors, radius, spacing } from '@/theme';
import { formatMoney, ordinal } from '@/utils/format';

const MEDAL = [colors.gold, colors.silver, colors.bronze];

export function ResultsModal({ visible, results, onClose }: { visible: boolean; results: Competition['results']; onClose: () => void }) {
  const { t, lang } = useI18n();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.dialog}>
          <Txt size={17} weight="semibold" align="center">{t('resultsTitle')}</Txt>
          <View style={{ gap: spacing.sm, marginTop: spacing.lg }}>
            {results.map((r) => (
              <View key={r.position} style={styles.row}>
                <MaterialCommunityIcons name={r.position === 1 ? 'trophy' : 'medal'} size={22} color={MEDAL[r.position - 1] ?? colors.primary} />
                <View style={{ flex: 1 }}>
                  <Txt size={14} weight="semibold">{r.name}</Txt>
                  <Txt size={11.5} color={colors.primaryText}>{t('winnerLabel', { pos: ordinal(r.position, lang) })}</Txt>
                </View>
                <Txt size={14} weight="semibold" color={colors.primaryDark}>{formatMoney(r.amount)}</Txt>
              </View>
            ))}
          </View>
          <Pressable onPress={onClose} style={styles.close} accessibilityRole="button">
            <Txt weight="semibold" color={colors.white}>{t('close')}</Txt>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'center', padding: spacing.xl },
  dialog: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.xl, width: '100%', maxWidth: 420, alignSelf: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.primaryTint, borderRadius: radius.md, padding: spacing.md },
  close: { marginTop: spacing.xl, backgroundColor: colors.primary, borderRadius: radius.md, height: 44, alignItems: 'center', justifyContent: 'center' },
});
