/**
 * Coupon/discount configuration and validation.
 *
 * Defines available coupon codes, their discount rules,
 * and pricing calculation with discounts applied.
 */

import { SubscriptionPlan, BillingInterval } from '@/lib/prisma-types';

export interface CouponDefinition {
  code: string;
  percentOff: number;
  applicablePlans: SubscriptionPlan[];
  applicableIntervals: BillingInterval[];
  active: boolean;
}

export interface DiscountedPricing {
  /** Original net amount before discount (e.g. 180 for annual) */
  originalNet: number;
  /** Discount amount in euros (e.g. 90 for 50% off 180) */
  discountAmount: number;
  /** Net amount after discount (e.g. 90) */
  netAmount: number;
  /** VAT amount at 24% (e.g. 21.60) */
  vatAmount: number;
  /** Gross total including VAT (e.g. 111.60) */
  grossAmount: number;
  /** Discount percentage (e.g. 50) */
  percentOff: number;
}

const VAT_RATE = 0.24;

/**
 * Net prices (without VAT) per plan and interval.
 * Gross amounts in PLAN_PRICING = net * 1.24
 */
const NET_PRICES: Record<string, Record<string, number>> = {
  promoted: {
    month: 20,
    year: 180,
  },
};

/**
 * Active coupon codes registry.
 * Add new coupons here as needed.
 */
const COUPONS: Record<string, CouponDefinition> = {
  WELCOME50: {
    code: 'WELCOME50',
    percentOff: 50,
    applicablePlans: [SubscriptionPlan.promoted],
    applicableIntervals: [BillingInterval.year],
    active: true,
  },
};

/**
 * Find a coupon by code. Returns null if not found or inactive.
 */
export function findCoupon(code: string): CouponDefinition | null {
  const normalized = code.trim().toUpperCase();
  const coupon = COUPONS[normalized];
  if (!coupon || !coupon.active) return null;
  return coupon;
}

/**
 * Calculate discounted pricing for a coupon + plan + interval combination.
 * Returns null if the coupon doesn't apply to this plan/interval.
 */
export function calculateDiscountedPricing(
  coupon: CouponDefinition,
  plan: string,
  billingInterval: string,
): DiscountedPricing | null {
  if (!coupon.applicablePlans.includes(plan as SubscriptionPlan)) return null;
  if (!coupon.applicableIntervals.includes(billingInterval as BillingInterval)) return null;

  const netPrices = NET_PRICES[plan];
  if (!netPrices) return null;

  const originalNet = netPrices[billingInterval];
  if (originalNet == null) return null;

  const discountAmount = Math.round((originalNet * coupon.percentOff) / 100 * 100) / 100;
  const netAmount = Math.round((originalNet - discountAmount) * 100) / 100;
  const vatAmount = Math.round(netAmount * VAT_RATE * 100) / 100;
  const grossAmount = Math.round((netAmount + vatAmount) * 100) / 100;

  return {
    originalNet,
    discountAmount,
    netAmount,
    vatAmount,
    grossAmount,
    percentOff: coupon.percentOff,
  };
}
