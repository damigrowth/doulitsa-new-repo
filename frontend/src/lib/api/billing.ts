/** Billing API — talks to Django's /api/billing/, /api/payment/, /api/payments/. */
import { api } from './client';

export const createCheckoutSession = (body: { billingInterval: 'month' | 'year'; couponCode?: string }) =>
  api.post<{ url: string; orderId?: string }>('/billing/checkout', body);

export const toggleFeaturedService = (serviceId: number) =>
  api.post(`/billing/services/${serviceId}/featured/toggle`);

export const syncBilling = () => api.post('/billing/sync');

export const validateCoupon = (body: { code: string; billingInterval: 'month' | 'year' }) =>
  api.post('/billing/coupons/validate', body, { anonymous: true });

export const restoreSubscription = () => api.post('/billing/subscription/restore');

export const cancelSubscription = (cancelAtPeriodEnd = true) =>
  api.post('/billing/subscription/cancel', { cancelAtPeriodEnd });

export const getMySubscription = () =>
  api.get<{ subscription: unknown }>('/billing/subscription');

// ---- payment-flow routes (kept at original Next.js paths) ---------------

export const checkPaymentsAccess = () =>
  api.get<{ allowed: boolean; reason: string | null; testModeBanner?: string | null }>(
    '/payments/check-access',
  );
