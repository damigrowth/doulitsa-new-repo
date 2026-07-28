/**
 * Subscription plan configuration and pricing.
 *
 * Single source of truth for:
 * - Plan features and limits (used by feature gates, checkout UI, plan comparison)
 * - Plan pricing amounts (used by Worldline adapter and recurring billing cron)
 */

/**
 * Subscription plan features and limits.
 *
 * PROMOTED plan benefits (from issue #411):
 * - Profile featured placement in archives (top positions with rotation)
 * - Up to 15 published services (free: 3)
 * - Up to 3 featured services (star icon in dashboard)
 * - Automatic daily refresh for all published services
 * - Priority in "Similar Services" section on service pages
 * - "Additional Services" section on subscriber's service pages
 */
export const SUBSCRIPTION_PLANS = {
  free: {
    name: 'Βασικό',
    maxServices: 3,
    maxFeaturedServices: 0,
    maxDailyRefreshes: 3,
    autoRefresh: false,
    featuredPlacement: false,
    prioritySimilar: false,
    additionalServicesSection: false,
  },
  promoted: {
    name: 'Προωθημένο',
    maxServices: 15,
    maxFeaturedServices: 3,
    maxDailyRefreshes: Infinity,
    autoRefresh: true,
    featuredPlacement: true,
    prioritySimilar: true,
    additionalServicesSection: true,
  },
} as const;

export type PlanKey = keyof typeof SUBSCRIPTION_PLANS;

/**
 * Plan pricing amounts (gross, including 24% VAT).
 * Used by Worldline checkout and recurring billing.
 */
export const PLAN_PRICING = {
  promoted: {
    month: '24.80',
    year: '223.20',
  },
} as const;

/**
 * Get the amount string for a plan and billing interval.
 * Throws if the plan or interval is unknown.
 */
export function getPlanAmount(plan: string, billingInterval: string): string {
  const planPricing = PLAN_PRICING[plan as keyof typeof PLAN_PRICING];
  if (!planPricing) {
    throw new Error(`Unknown plan: ${plan}`);
  }
  const amount = planPricing[billingInterval as keyof typeof planPricing];
  if (!amount) {
    throw new Error(`Unknown billing interval: ${billingInterval} for plan: ${plan}`);
  }
  return amount;
}
