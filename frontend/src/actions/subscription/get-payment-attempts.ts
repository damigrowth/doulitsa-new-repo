'use server';

import * as billingApi from '@/lib/api/billing';
import { ApiError } from '@/lib/api/client';
import type { ActionResult } from '@/lib/types/api';
import type { PaymentAttemptRow } from '@/components/subscription/payment-attempts-list';

export interface PaymentHistory {
  attempts: PaymentAttemptRow[];
  total: number;
  page: number;
  totalPages: number;
}

/**
 * The caller's own subscription payment history (paginated, newest first).
 * Restores what OLD dashboard/promote/page.tsx read directly from Prisma.
 */
export async function getMyPaymentAttempts(page = 1): Promise<ActionResult<PaymentHistory>> {
  try {
    const raw = await billingApi.getMyPaymentAttempts(page);
    return {
      success: true,
      data: {
        attempts: (raw.attempts ?? []).map((a) => ({
          id: a.id,
          status: a.status as PaymentAttemptRow['status'],
          source: a.source as PaymentAttemptRow['source'],
          amount: a.amount,
          currency: a.currency,
          sequence: a.sequence,
          txId: a.txId,
          orderId: a.orderId,
          createdAt: new Date(a.createdAt),
        })),
        total: raw.total ?? 0,
        page: raw.page ?? 1,
        totalPages: raw.totalPages ?? 1,
      },
    };
  } catch (err) {
    // Best-effort like OLD (.catch(() => [])): never break the promote page.
    if (err instanceof ApiError) {
      return { success: true, data: { attempts: [], total: 0, page: 1, totalPages: 1 } };
    }
    return { success: true, data: { attempts: [], total: 0, page: 1, totalPages: 1 } };
  }
}
