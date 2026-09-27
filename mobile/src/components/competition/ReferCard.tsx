import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { Pressable, Share, StyleSheet, View } from 'react-native';
import type { ViewerState } from '@/api/types';
import { Txt } from '@/components/ui/Txt';
import { useToast } from '@/components/ui/Toast';
import { useI18n } from '@/i18n/LanguageProvider';
import { colors, radius, spacing } from '@/theme';
import { formatMoney } from '@/utils/format';

/** The referral link is per user, so this card is driven by viewer state. */
export function ReferCard({ referral }: { referral: ViewerState['referral'] | undefined }) {
  const { t } = useI18n();
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  if (!referral) return null;

  const copy = async () => {
    await Clipboard.setStringAsync(referral.link);
    setCopied(true);
    toast(t('copied'), 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const share = () =>
    Share.share({ message: t('referShareMessage', { link: referral.link }), url: referral.link }).catch(() => {});

  return (
    <View style={styles.card}>
      <Ionicons name="megaphone-outline" size={34} color={colors.primary} style={{ transform: [{ rotate: '-12deg' }] }} />
      <View style={{ flex: 1, gap: spacing.sm }}>
        <Txt size={13.5} weight="semibold">{t('referTitle')}</Txt>
        <View style={styles.linkBox}>
          <Txt size={11.5} numberOfLines={1} style={{ flex: 1, paddingHorizontal: spacing.sm }} selectable>
            {referral.link}
          </Txt>
          <Pressable onPress={copy} style={styles.copyBtn} accessibilityRole="button" accessibilityLabel={t('copyLink')}>
            <Txt size={11.5} weight="semibold">{copied ? t('copied') : t('copyLink')}</Txt>
          </Pressable>
        </View>
      </View>
      <View style={{ alignItems: 'center', gap: 6, alignSelf: 'flex-end', maxWidth: 118 }}>
        <Pressable onPress={share} style={styles.referBtn} accessibilityRole="button">
          <Txt size={13} weight="semibold" color={colors.white}>{t('referNow')}</Txt>
        </Pressable>
        {referral.rewardPerSignup > 0 && (
          <Txt size={10.5} color={colors.primaryText} align="center">
            {t('youEarn')}{' '}
            <Txt size={11.5} weight="bold" color={colors.primaryDark}>{formatMoney(referral.rewardPerSignup, { symbolSpace: false })}</Txt>
            {' '}{t('forEverySignup')}
          </Txt>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.mint,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  linkBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.sm,
    backgroundColor: colors.white,
    height: 32,
  },
  copyBtn: {
    paddingHorizontal: spacing.sm,
    height: '100%',
    justifyContent: 'center',
    borderLeftWidth: 1,
    borderLeftColor: colors.borderStrong,
  },
  referBtn: {
    backgroundColor: colors.primaryDark,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    minWidth: 100,
    alignItems: 'center',
  },
});
