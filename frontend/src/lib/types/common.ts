/**
 * Common type definitions used across the application
 */

import { SubscriptionType, Status } from '@/lib/prisma-types';

/**
 * Status color mappings for UI consistency
 */
export const StatusColors = {
  [Status.draft]: {
    bg: 'bg-gray-100',
    text: 'text-gray-700',
    border: 'border-gray-300',
    dot: 'bg-gray-500',
  },
  [Status.pending]: {
    bg: 'bg-yellow-100',
    text: 'text-yellow-700',
    border: 'border-yellow-300',
    dot: 'bg-yellow-500',
  },
  [Status.published]: {
    bg: 'bg-green-100',
    text: 'text-green-700',
    border: 'border-green-300',
    dot: 'bg-green-500',
  },
  [Status.rejected]: {
    bg: 'bg-red-100',
    text: 'text-red-700',
    border: 'border-red-300',
    dot: 'bg-red-500',
  },
  [Status.approved]: {
    bg: 'bg-blue-100',
    text: 'text-blue-700',
    border: 'border-blue-300',
    dot: 'bg-blue-500',
  },
  [Status.inactive]: {
    bg: 'bg-gray-100',
    text: 'text-gray-500',
    border: 'border-gray-200',
    dot: 'bg-gray-400',
  },
} as const;

/**
 * Status labels in Greek
 */
export const StatusLabels = {
  [Status.draft]: 'Πρόχειρο',
  [Status.pending]: 'Υπό Έλεγχο',
  [Status.published]: 'Δημοσιευμένο',
  [Status.rejected]: 'Απορρίφθηκε',
  [Status.approved]: 'Εγκρίθηκε',
  [Status.inactive]: 'Ανενεργό',
} as const;

/**
 * Type guard to check if a value is a valid Status
 */
export function isValidStatus(value: unknown): value is Status {
  return Object.values(Status).includes(value as Status);
}

/**
 * Subscription type labels in Greek (using Prisma-generated enum)
 */
export const SubscriptionTypeLabels = {
  [SubscriptionType.month]: 'Μηνιαία',
  [SubscriptionType.year]: 'Ετήσια',
  [SubscriptionType.per_case]: 'Ανά Περίπτωση',
  [SubscriptionType.per_hour]: 'Ανά Ώρα',
  [SubscriptionType.per_session]: 'Ανά Συνεδρία',
} as const;

/**
 * Type guard to check if a value is a valid SubscriptionType
 */
export function isValidSubscriptionType(value: unknown): value is SubscriptionType {
  return Object.values(SubscriptionType).includes(value as SubscriptionType);
}

/**
 * Archive sort options for service and profile listings
 */
export type ArchiveSortBy =
  | 'default'
  | 'recent'
  | 'oldest'
  | 'price_asc'
  | 'price_desc'
  | 'rating_high'
  | 'rating_low';

/**
 * Type guard to check if a value is a valid ArchiveSortBy
 */
export function isValidArchiveSortBy(value: unknown): value is ArchiveSortBy {
  const validSortOptions: ArchiveSortBy[] = [
    'default',
    'recent',
    'oldest',
    'price_asc',
    'price_desc',
    'rating_high',
    'rating_low',
  ];
  return validSortOptions.includes(value as ArchiveSortBy);
}

// Re-export Prisma-generated enums for convenience
export { SubscriptionType, Status };