import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Txt } from '@/components/ui/Txt';
import { useCountdown } from '@/hooks/useCountdown';
import { useI18n } from '@/i18n/LanguageProvider';
import { colors, radius, spacing } from '@/theme';
import { formatMinSec, formatMoney } from '@/utils/format';

export interface PendingCheckout {
  registrationId: string;
  orderId: string;
  amount: number;
  holdExpiresAt: string | null;
}

/**
 * Stand-in for the payment gateway's checkout sheet. Shows the live seat-hold
 * timer so the user knows the reservation is temporary.
 */
export function PaymentSheet({
  checkout,
  competitionTitle,
  paying,
  cancelling,
  onPay,
  onCancel,
  onExpired,
}: {
  checkout: PendingCheckout | null;
  competitionTitle: string;
  paying: boolean;
  cancelling: boolean;
  onPay: () => void;
  onCancel: () => void;
  onExpired: () => void;
}) {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const remaining = useCountdown(checkout?.holdExpiresAt);
  const expired = !!remaining && remaining.totalMs <= 0;

  useEffect(() => {
    if (checkout && expired && !paying) onExpired();
  }, [checkout, expired, paying, onExpired]);

  return (
    <Modal visible={!!checkout} transparent animationType="slide" onRequestClose={onCancel} statusBarTranslucent>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]}>
          <View style={styles.grabber} />
          <Txt size={17} weight="semibold">{t('checkoutTitle')}</Txt>
          <Txt size={13} color={colors.textSecondary} style={{ marginTop: 2 }}>{competitionTitle}</Txt>

          <View style={styles.amountRow}>
            <Txt size={13} color={colors.textSecondary}>{t('entryFee')}</Txt>
            <Txt size={22} weight="bold">{checkout ? formatMoney(checkout.amount) : ''}</Txt>
          </View>

          {remaining && (
            <View style={styles.hold}>
              <Ionicons name="time-outline" size={18} color={colors.warning} />
              <Txt size={13} color={colors.warning} weight="medium">
                {t('seatReserved')} {formatMinSec(remaining)}
              </Txt>
            </View>
          )}

          <Pressable
            style={[styles.payBtn, (paying || expired) && { opacity: 0.7 }]}
            onPress={onPay}
            disabled={paying || cancelling || expired}
            accessibilityRole="button"
          >
            {paying ? (
              <View style={styles.inline}>
                <ActivityIndicator color={colors.white} />
                <Txt weight="semibold" color={colors.white}>{t('payingSecurely')}</Txt>
              </View>
            ) : (
              <Txt size={15} weight="semibold" color={colors.white}>
                {t('pay', { fee: checkout ? formatMoney(checkout.amount) : '' })}
              </Txt>
            )}
          </Pressable>
          <Pressable style={styles.cancelBtn} onPress={onCancel} disabled={paying || cancelling} accessibilityRole="button">
            {cancelling ? <ActivityIndicator color={colors.text} /> : <Txt weight="medium">{t('cancel')}</Txt>}
          </Pressable>

          <View style={[styles.inline, { justifyContent: 'center', marginTop: spacing.sm }]}>
            <Ionicons name="lock-closed-outline" size={13} color={colors.textMuted} />
            <Txt size={11} color={colors.textMuted}>{t('mockGatewayNote')}</Txt>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
  },
  grabber: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.borderStrong, marginBottom: spacing.lg },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  hold: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.warningSoft,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.lg,
  },
  payBtn: {
    marginTop: spacing.lg,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: { height: 44, alignItems: 'center', justifyContent: 'center', marginTop: spacing.xs },
  inline: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
