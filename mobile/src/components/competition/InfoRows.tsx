import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { Card } from '@/components/ui/Card';
import { Txt } from '@/components/ui/Txt';
import { useI18n } from '@/i18n/LanguageProvider';
import { colors, radius, spacing } from '@/theme';
import { openVideo } from '@/utils/media';

export function Disclaimer({ text }: { text: string | null }) {
  const { t } = useI18n();
  if (!text) return null;
  return (
    <View style={styles.disclaimer}>
      <Ionicons name="information-circle-outline" size={20} color={colors.primaryText} />
      <Txt size={12} style={{ flex: 1 }}>
        <Txt size={12} weight="semibold" color={colors.primaryText}>{t('disclaimer')} </Txt>
        {text}
      </Txt>
    </View>
  );
}

/** "How will you receive prize money?" + refund policy + payment provider. */
export function TrustRow({ prizeInfoVideoUrl }: { prizeInfoVideoUrl: string | null }) {
  const { t } = useI18n();
  return (
    <View style={styles.trustRow}>
      <Pressable
        style={[styles.trustCard, { flex: 1 }]}
        onPress={() => openVideo(prizeInfoVideoUrl)}
        disabled={!prizeInfoVideoUrl}
        accessibilityRole="button"
      >
        <View style={styles.videoIcon}>
          <View style={styles.videoIconInner}>
            <Ionicons name="play" size={16} color={colors.white} style={{ marginLeft: 2 }} />
          </View>
        </View>
        <View style={{ flex: 1 }}>
          <Txt size={12.5} weight="semibold">{t('howReceivePrize')}</Txt>
          <Txt size={11} color={colors.textMuted}>{t('watchVideo')}</Txt>
        </View>
      </Pressable>

      <View style={[styles.trustCard, { flex: 1.2, flexDirection: 'column', alignItems: 'flex-start', gap: spacing.sm }]}>
        <Pressable
          style={styles.inline}
          onPress={() => Alert.alert(t('refundPolicy'), t('refundPolicyBody'))}
          accessibilityRole="button"
        >
          <MaterialCommunityIcons name="shield-check-outline" size={20} color={colors.text} />
          <Txt size={12} style={{ textDecorationLine: 'underline' }}>{t('refundPolicy')}</Txt>
        </Pressable>
        <View style={styles.inline}>
          <MaterialCommunityIcons name="shield-check-outline" size={20} color={colors.text} />
          <Txt size={11.5} style={{ flexShrink: 1 }}>
            {t('securePayments')}{' '}
            <Txt size={12.5} weight="bold" color="#072654" style={{ fontStyle: 'italic' }}>Razorpay</Txt>
          </Txt>
        </View>
      </View>
    </View>
  );
}

export function TestimonialsLink() {
  const { t } = useI18n();
  return (
    <Pressable onPress={() => router.push('/testimonials')} accessibilityRole="button">
      <Card style={styles.linkRow}>
        <Ionicons name="chatbubble-ellipses-outline" size={24} color={colors.text} />
        <View style={{ flex: 1 }}>
          <Txt size={13} weight="semibold">{t('hearFromUsers')}</Txt>
          <Txt size={11} color={colors.textMuted}>{t('hearFromUsersSub')}</Txt>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.text} />
      </Card>
    </Pressable>
  );
}

/** Reserved ad slot; a real build would load a sponsored unit here. */
export function AdSlot() {
  const { t } = useI18n();
  return (
    <View style={styles.ad} accessibilityLabel={t('adHere')}>
      <Ionicons name="megaphone-outline" size={18} color={colors.textMuted} />
      <Txt size={12.5} weight="medium" color={colors.textMuted}>{t('adHere')}</Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  disclaimer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  trustRow: { flexDirection: 'row', gap: spacing.sm },
  trustCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    backgroundColor: colors.surface,
  },
  videoIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: '#CFE9E4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoIconInner: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inline: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
  ad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
  },
});
