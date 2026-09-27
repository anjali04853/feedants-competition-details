import { request, uploadFile } from './client';
import type {
  Competition,
  CompetitionSummary,
  RegistrationResult,
  Testimonial,
  User,
  ViewerState,
} from './types';
import type { Lang } from '@/i18n/strings';

export const api = {
  listCompetitions: (lang: Lang) => request<CompetitionSummary[]>('/competitions', { query: { lang } }),

  getCompetition: (idOrSlug: string, lang: Lang) =>
    request<Competition>(`/competitions/${encodeURIComponent(idOrSlug)}`, { query: { lang } }),

  getViewerState: (idOrSlug: string) => request<ViewerState>(`/competitions/${encodeURIComponent(idOrSlug)}/me`),

  register: (idOrSlug: string, referralCode?: string) =>
    request<RegistrationResult>(`/competitions/${encodeURIComponent(idOrSlug)}/registrations`, {
      method: 'POST',
      body: referralCode ? { referralCode } : {},
    }),

  confirmPayment: (registrationId: string, body: { orderId: string; paymentId: string; signature: string }) =>
    request<{ id: string; status: string }>(`/registrations/${registrationId}/payment/confirm`, { method: 'POST', body }),

  cancelHold: (registrationId: string) =>
    request<{ id: string; status: string }>(`/registrations/${registrationId}/cancel`, { method: 'POST' }),

  /** Stand-in for the payment gateway's checkout UI (mock provider only). */
  mockCheckout: (orderId: string) =>
    request<{ paymentId: string; signature: string }>('/dev/payments/checkout', { method: 'POST', body: { orderId } }),

  uploadSubmission: (
    idOrSlug: string,
    file: { uri: string; name: string; type: string; webFile?: File },
    onProgress?: (fraction: number) => void,
  ) =>
    uploadFile<{ id: string; revision: number; submittedAt: string }>(
      `/competitions/${encodeURIComponent(idOrSlug)}/submission`,
      file,
      onProgress,
    ),

  testimonials: (lang: Lang) => request<Testimonial[]>('/testimonials', { query: { lang, limit: '20' } }),

  devUsers: () => request<User[]>('/auth/dev-users'),
  devLogin: (userId: string) => request<{ token: string; user: User }>('/auth/dev-login', { method: 'POST', body: { userId } }),
  me: () => request<User>('/users/me'),
};
