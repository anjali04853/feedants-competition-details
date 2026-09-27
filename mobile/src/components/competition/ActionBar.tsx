import * as DocumentPicker from 'expo-document-picker';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, View } from 'react-native';
import { ApiError } from '@/api/client';
import { useCancelHold, useCompletePayment, useRegister, useUploadSubmission } from '@/api/queries';
import type { Competition, ViewerState } from '@/api/types';
import { Txt } from '@/components/ui/Txt';
import { useToast } from '@/components/ui/Toast';
import { useCountdown } from '@/hooks/useCountdown';
import { useI18n } from '@/i18n/LanguageProvider';
import { colors, radius, spacing } from '@/theme';
import { formatDateTime, formatMinSec, formatMoney } from '@/utils/format';
import { PaymentSheet, PendingCheckout } from './PaymentSheet';
import { ResultsModal } from './ResultsModal';

/** Hold timer as its own component so only it re-renders every second. */
function HoldTimer({ endsAt }: { endsAt: string | null }) {
  const { t } = useI18n();
  const remaining = useCountdown(endsAt);
  if (!remaining) return null;
  return <Txt size={11.5} color={colors.white} style={styles.sub}>{t('sub_hold', { time: formatMinSec(remaining) })}</Txt>;
}

/**
 * Sticky primary action. Everything it shows is derived from the server's
 * `cta` (action + enabled + reason); the client never decides on its own
 * whether an action is allowed, it only renders and triggers it.
 */
export function ActionBar({ competition, viewer }: { competition: Competition; viewer: ViewerState | undefined }) {
  const { t, lang } = useI18n();
  const toast = useToast();
  const id = competition.slug;
  const [checkout, setCheckout] = useState<PendingCheckout | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [progress, setProgress] = useState(0);

  const register = useRegister(id);
  const pay = useCompletePayment(id);
  const cancel = useCancelHold(id);
  const upload = useUploadSubmission(id, setProgress);

  const fee = formatMoney(competition.entryFee);
  const busy = register.isPending || upload.isPending;

  const showError = useCallback(
    (err: unknown) => {
      if (err instanceof ApiError) {
        toast(err.code === 'NETWORK_ERROR' ? t('networkError') : err.message, 'error');
      } else {
        toast(t('genericError'), 'error');
      }
    },
    [t, toast],
  );

  const startRegistration = async () => {
    try {
      const reg = await register.mutateAsync(undefined);
      if (reg.status === 'confirmed') {
        toast(t('registeredToast'), 'success');
      } else if (reg.order) {
        setCheckout({ registrationId: reg.id, orderId: reg.order.orderId, amount: reg.amount, holdExpiresAt: reg.holdExpiresAt });
      }
    } catch (err) {
      showError(err);
    }
  };

  const resumePayment = () => {
    const r = viewer?.registration;
    if (r?.orderId) setCheckout({ registrationId: r.id, orderId: r.orderId, amount: r.amount, holdExpiresAt: r.holdExpiresAt });
  };

  const completePayment = async () => {
    if (!checkout) return;
    try {
      await pay.mutateAsync({ registrationId: checkout.registrationId, orderId: checkout.orderId });
      setCheckout(null);
      toast(t('registeredToast'), 'success');
    } catch (err) {
      setCheckout(null);
      showError(err);
    }
  };

  const cancelCheckout = async () => {
    if (!checkout) return;
    try {
      await cancel.mutateAsync(checkout.registrationId);
    } catch {
      // Hold will lapse on its own; nothing else to do.
    }
    setCheckout(null);
  };

  const onHoldExpired = useCallback(() => setCheckout(null), []);

  const pickAndUpload = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: 'video/*', copyToCacheDirectory: true });
    if (result.canceled || !result.assets?.length) return;
    const asset = result.assets[0];
    setProgress(0);
    try {
      await upload.mutateAsync({
        uri: asset.uri,
        name: asset.name,
        type: asset.mimeType ?? 'video/mp4',
        webFile: Platform.OS === 'web' ? asset.file : undefined,
      });
      toast(t('submissionToast'), 'success');
    } catch (err) {
      showError(err);
    }
  };

  // ------------------------------------------------------------------ labels
  let title = '';
  let subtitle: React.ReactNode = null;
  let onPress: (() => void) | undefined;
  let enabled = false;

  const cta = viewer?.cta;
  const sub = (text: string) => <Txt size={11.5} color={colors.white} style={styles.sub}>{text}</Txt>;

  if (!cta) {
    title = '';
  } else {
    enabled = cta.enabled;
    switch (cta.action) {
      case 'register':
        if (cta.reason === 'sold_out') {
          title = t('cta_sold_out');
          subtitle = sub(t('sub_all_booked', { capacity: competition.spots.capacity }));
        } else if (cta.reason === 'registration_not_open') {
          title = t('cta_registration_not_open');
          subtitle = cta.at ? sub(t('sub_opens_at', { at: formatDateTime(cta.at, lang) })) : null;
        } else if (cta.reason === 'registration_closed') {
          title = t('cta_registration_closed');
          subtitle = sub(t('sub_closed_at', { at: formatDateTime(competition.schedule.registrationClosesAt, lang) }));
        } else {
          title = competition.entryFee === 0 ? t('cta_register_free') : t('cta_register', { fee });
          subtitle = sub(t('sub_spots_left', { n: competition.spots.remaining, capacity: competition.spots.capacity }));
          onPress = startRegistration;
        }
        break;
      case 'complete_payment':
        title = t('cta_complete_payment', { fee });
        subtitle = <HoldTimer endsAt={cta.at} />;
        onPress = resumePayment;
        break;
      case 'upload_submission':
        title = t('cta_upload_submission');
        subtitle = cta.reason === 'submission_not_started' && cta.at
          ? sub(`${t('registered')} · ${t('sub_opens_at', { at: formatDateTime(cta.at, lang) })}`)
          : sub(t('registered'));
        onPress = pickAndUpload;
        break;
      case 'replace_submission':
        title = t('cta_replace_submission');
        subtitle = viewer?.submission ? sub(t('sub_submitted', { at: formatDateTime(viewer.submission.submittedAt, lang) })) : null;
        onPress = pickAndUpload;
        break;
      case 'view_results':
        title = t('cta_view_results');
        onPress = () => setShowResults(true);
        break;
      default:
        if (cta.reason === 'cancelled') title = t('cta_cancelled');
        else if (cta.reason === 'awaiting_results') {
          title = t('cta_awaiting_results');
          subtitle = cta.at ? sub(t('sub_results_on', { at: formatDateTime(cta.at, lang) })) : null;
        } else if (cta.reason === 'submission_missed') {
          title = t('cta_submission_missed');
          subtitle = sub(t('sub_no_entry'));
        } else title = t('cta_registration_closed');
    }
  }

  if (upload.isPending) {
    title = t('uploading', { pct: Math.round(progress * 100) });
    subtitle = null;
  }

  return (
    <>
      <View style={styles.wrap}>
        <Pressable
          onPress={onPress}
          disabled={!enabled || busy || !onPress}
          style={({ pressed }) => [
            styles.button,
            (!enabled || !cta) && styles.disabled,
            pressed && { opacity: 0.9 },
          ]}
          accessibilityRole="button"
          accessibilityState={{ disabled: !enabled || busy, busy }}
        >
          {!cta || register.isPending ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <>
              <Txt size={15} weight="semibold" color={colors.white}>{title}</Txt>
              {subtitle}
            </>
          )}
          {upload.isPending && <View style={[styles.progress, { width: `${progress * 100}%` }]} />}
        </Pressable>
      </View>

      <PaymentSheet
        checkout={checkout}
        competitionTitle={competition.title}
        paying={pay.isPending}
        cancelling={cancel.isPending}
        onPay={completePayment}
        onCancel={cancelCheckout}
        onExpired={onHoldExpired}
      />
      <ResultsModal visible={showResults} results={competition.results} onClose={() => setShowResults(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.sm, backgroundColor: colors.background },
  button: {
    minHeight: 52,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    overflow: 'hidden',
  },
  disabled: { backgroundColor: '#7FA9A7' },
  sub: { opacity: 0.9, marginTop: -1 },
  progress: { position: 'absolute', left: 0, bottom: 0, height: 3, backgroundColor: colors.white, opacity: 0.8 },
});
