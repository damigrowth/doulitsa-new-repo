import { z } from 'zod';
import {
  SubscriptionPlan,
  BillingInterval,
  SubscriptionStatus,
} from '@/lib/prisma-types';

/**
 * Subscription Validation Schemas
 * Provider-agnostic schemas for subscription operations
 * Derived from the shared subscription enums for compile-time safety
 */

// Subscription plan enum
export const subscriptionPlanSchema = z.nativeEnum(SubscriptionPlan);

// Billing interval enum
export const billingIntervalSchema = z.nativeEnum(BillingInterval);

// Subscription status enum
export const subscriptionStatusSchema = z.nativeEnum(SubscriptionStatus);

/**
 * Create checkout session input
 * Used by PaymentService.createCheckout
 */
export const createCheckoutSessionSchema = z.object({
  // Plan to subscribe to (default: promoted for upgrades)
  plan: subscriptionPlanSchema.default(SubscriptionPlan.promoted),
  // Billing interval (monthly or yearly)
  billingInterval: billingIntervalSchema,
  // Optional coupon code for discount
  couponCode: z.string().optional(),
});

/**
 * Cancel subscription input
 */
export const cancelSubscriptionSchema = z.object({
  // If true, subscription will cancel at end of billing period
  // If false, subscription will cancel immediately
  cancelAtPeriodEnd: z.boolean().default(true),
});

/**
 * Restore subscription input (empty - just needs profileId from auth)
 */
export const restoreSubscriptionSchema = z.object({});

/**
 * Customer portal input
 */
export const customerPortalSchema = z.object({
  returnUrl: z.string().url().optional(),
});

// Type exports (SubscriptionPlan, BillingInterval, SubscriptionStatus come from @/lib/prisma-types)
export type CreateCheckoutSessionInput = z.infer<typeof createCheckoutSessionSchema>;
export type CancelSubscriptionInput = z.infer<typeof cancelSubscriptionSchema>;
export type RestoreSubscriptionInput = z.infer<typeof restoreSubscriptionSchema>;
export type CustomerPortalInput = z.infer<typeof customerPortalSchema>;
