import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useAuth } from '@/auth/AuthProvider';
import { useI18n } from '@/i18n/LanguageProvider';
import { api } from './endpoints';
import { serverNow } from './serverClock';

/** Seat counts can change as other users register; refresh while the screen is open. */
const LIVE_REFRESH_MS = 15_000;

export const queryKeys = {
  competitions: (lang: string) => ['competitions', lang] as const,
  competition: (id: string, lang: string) => ['competition', id, lang] as const,
  competitionAll: (id: string) => ['competition', id] as const,
  viewer: (id: string, userId: string | undefined) => ['viewer', id, userId] as const,
  viewerAll: (id: string) => ['viewer', id] as const,
  testimonials: (lang: string) => ['testimonials', lang] as const,
};

export function useCompetitions() {
  const { lang } = useI18n();
  return useQuery({ queryKey: queryKeys.competitions(lang), queryFn: () => api.listCompetitions(lang) });
}

export function useCompetition(id: string) {
  const { lang } = useI18n();
  return useQuery({
    queryKey: queryKeys.competition(id, lang),
    queryFn: () => api.getCompetition(id, lang),
    refetchInterval: LIVE_REFRESH_MS,
    placeholderData: (prev) => prev, // keep showing content while switching language
  });
}

export function useViewerState(id: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.viewer(id, user?.id),
    queryFn: () => api.getViewerState(id),
    enabled: !!user,
    refetchInterval: LIVE_REFRESH_MS,
  });
}

export function useTestimonials() {
  const { lang } = useI18n();
  return useQuery({ queryKey: queryKeys.testimonials(lang), queryFn: () => api.testimonials(lang) });
}

/**
 * The server tells us the next instant at which the competition or viewer state
 * changes (registration closes, submissions open, a hold expires...). Refetch
 * exactly then so the UI flips state on time, without aggressive polling.
 */
export function useRefetchAtTransitions(id: string, ...instants: (string | null | undefined)[]) {
  const queryClient = useQueryClient();
  const next = instants
    .filter((v): v is string => !!v)
    .map(Date.parse)
    .filter((t) => t > serverNow())
    .sort((a, b) => a - b)[0];

  useEffect(() => {
    if (!next) return;
    // setTimeout overflows above ~24.8 days; re-evaluated on every refetch anyway.
    const delay = Math.min(next - serverNow() + 500, 2 ** 31 - 1);
    const timer = setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: queryKeys.competitionAll(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.viewerAll(id) });
    }, delay);
    return () => clearTimeout(timer);
  }, [id, next, queryClient]);
}

/** Invalidate both public and viewer state after any mutation (or failed mutation). */
export function useInvalidateCompetition(id: string) {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.competitionAll(id) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.viewerAll(id) }),
      queryClient.invalidateQueries({ queryKey: ['competitions'] }),
    ]);
}

export function useRegister(id: string) {
  const invalidate = useInvalidateCompetition(id);
  return useMutation({
    mutationFn: (referralCode?: string) => api.register(id, referralCode),
    onSettled: invalidate,
  });
}

export function useCompletePayment(id: string) {
  const invalidate = useInvalidateCompetition(id);
  return useMutation({
    mutationFn: async ({ registrationId, orderId }: { registrationId: string; orderId: string }) => {
      const payment = await api.mockCheckout(orderId);
      return api.confirmPayment(registrationId, { orderId, ...payment });
    },
    onSettled: invalidate,
  });
}

export function useCancelHold(id: string) {
  const invalidate = useInvalidateCompetition(id);
  return useMutation({ mutationFn: (registrationId: string) => api.cancelHold(registrationId), onSettled: invalidate });
}

export function useUploadSubmission(id: string, onProgress: (fraction: number) => void) {
  const invalidate = useInvalidateCompetition(id);
  return useMutation({
    mutationFn: (file: { uri: string; name: string; type: string; webFile?: File }) =>
      api.uploadSubmission(id, file, onProgress),
    onSettled: invalidate,
  });
}
