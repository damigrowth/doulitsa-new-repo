/**
 * Feature gating — Django-backed.
 *
 * Reads the caller's subscription via the Django billing endpoint and
 * derives plan limits from `SUBSCRIPTION_PLANS`. The `profileId` argument
 * is ignored (Django infers from the JWT).
 */

import * as billingApi from '@/lib/api/billing';
import { ApiError } from '@/lib/api/client';
import { SUBSCRIPTION_PLANS, type PlanKey } from '@/lib/payment/pricing';
import { getUserServiceStats } from '@/actions/services/get-user-services';

interface SubscriptionShape {
  status?: string;
  plan?: string;
  amount?: number | null;
}

async function loadSubscription(): Promise<SubscriptionShape | null> {
  try {
    const res = await billingApi.getMySubscription();
    return (res?.subscription ?? null) as SubscriptionShape | null;
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) return null;
    return null;
  }
}

export async function getActivePlan(_profileId: string): Promise<PlanKey> {
  const sub = await loadSubscription();
  if (!sub) return 'free' as PlanKey;
  if (sub.status === 'active' && sub.plan === 'promoted') {
    return 'promoted' as PlanKey;
  }
  return 'free' as PlanKey;
}

export async function getPlanLimits(profileId: string) {
  const plan = await getActivePlan(profileId);
  return SUBSCRIPTION_PLANS[plan];
}

export async function canCreateService(profileId: string): Promise<boolean> {
  const limits = await getPlanLimits(profileId);
  const stats = await getUserServiceStats();
  // Fail open if stats are unavailable — the backend still enforces the cap.
  if (!stats.success) return true;
  // Active = published + pending, counted against maxServices — mirrors the
  // backend `_can_create_more` so the UI pre-block matches the server's 403.
  const active = stats.data.published + stats.data.pending;
  return active < limits.maxServices;
}

export async function canFeatureService(profileId: string): Promise<boolean> {
  const plan = await getActivePlan(profileId);
  return plan === 'promoted';
}

export async function hasAutoRefresh(profileId: string): Promise<boolean> {
  const plan = await getActivePlan(profileId);
  return plan === 'promoted';
}

export async function getRemainingFeaturedSlots(profileId: string): Promise<number> {
  const can = await canFeatureService(profileId);
  return can ? SUBSCRIPTION_PLANS.promoted.maxFeaturedServices : 0;
}
