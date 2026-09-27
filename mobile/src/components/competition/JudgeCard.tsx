import { Ionicons } from '@expo/vector-icons';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import type { Competition } from '@/api/types';
import { Card } from '@/components/ui/Card';
import { Txt } from '@/components/ui/Txt';
import { useI18n } from '@/i18n/LanguageProvider';
import { colors, spacing } from '@/theme';
import { openVideo } from '@/utils/media';

export function JudgeCard({ judge }: { judge: Competition['judge'] }) {
  const { t } = useI18n();
  return (
    <Card style={styles.card}>
      {judge.avatarUrl ? (
        <Image source={{ uri: judge.avatarUrl }} style={styles.avatar} accessibilityIgnoresInvertColors />
      ) : (
        <View style={[styles.avatar, styles.avatarFallback]}>
          <Ionicons name="person" size={36} color={colors.textMuted} />
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Txt size={11} color={colors.textMuted}>{t('judge')}</Txt>
        <Txt size={16} weight="semibold">{judge.name}</Txt>
        <Txt size={12} color={colors.textSecondary}>{judge.title}</Txt>
        {judge.experienceYears != null && (
          <Txt size={12} color={colors.textSecondary}>{t('yearsExperience', { n: judge.experienceYears })}</Txt>
        )}
      </View>
      {judge.introVideoUrl && (
        <Pressable
          onPress={() => openVideo(judge.introVideoUrl)}
          style={styles.videoBtn}
          accessibilityRole="button"
          accessibilityLabel={`${t('introVideo')}: ${judge.name}`}
        >
          <View style={styles.play}>
            <Ionicons name="play" size={20} color={colors.primary} style={{ marginLeft: 3 }} />
          </View>
          <Txt size={12} color={colors.textSecondary}>{t('introVideo')}</Txt>
        </Pressable>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, paddingVertical: spacing.md },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.chip },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  videoBtn: { alignItems: 'center', gap: 6, paddingHorizontal: spacing.sm },
  play: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
