'use server';

import { adminTaxonomySubmissions } from '@/lib/api/admin';
import { ApiError } from '@/lib/api/client';
import type { ActionResult } from '@/lib/types/api';
import type { DatasetItem } from '@/lib/types/datasets';
import type { TaxonomyType } from '@/lib/types/taxonomy-operations';

const wrap = async <T>(fn: () => Promise<T>): Promise<ActionResult<T>> => {
  try { return { success: true, data: await fn() }; }
  catch (err) { return { success: false, error: err instanceof ApiError ? err.message : 'Σφάλμα δικτύου' }; }
};

export async function listTaxonomySubmissions(query: Record<string, unknown> = {}) {
  return wrap(() => adminTaxonomySubmissions.list(query));
}

export async function getTaxonomySubmissionStats() {
  return wrap(() => adminTaxonomySubmissions.stats());
}

// ---------------------------------------------------------------------------
// approve / reject / bulk — OLD returns a FLAT result object (not {success,data})
// so callers read result.success / result.draft / result.assignedId directly.
// See app_before_migrations/src/actions/admin/taxonomy-submission.ts:242-462.
// ---------------------------------------------------------------------------

interface ApproveTaxonomyResult {
  success: boolean;
  error?: string;
  assignedId?: string;
  // New DB flow: the item was written straight to the DB and is live immediately.
  published?: boolean;
  draft?: { taxonomyType: TaxonomyType; item: DatasetItem };
}

export async function approveTaxonomySubmission(
  submissionId: string,
): Promise<ApproveTaxonomyResult> {
  try {
    return (await adminTaxonomySubmissions.approve(submissionId)) as ApproveTaxonomyResult;
  } catch (err) {
    return { success: false, error: err instanceof ApiError ? err.message : 'Σφάλμα δικτύου' };
  }
}

export async function rejectTaxonomySubmission(
  id: string,
  reason?: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    return (await adminTaxonomySubmissions.reject(id, reason)) as {
      success: boolean;
      error?: string;
    };
  } catch (err) {
    return { success: false, error: err instanceof ApiError ? err.message : 'Σφάλμα δικτύου' };
  }
}

export async function bulkApproveTaxonomySubmissions(
  ids: string[],
): Promise<{ success: boolean; error?: string; approved: number }> {
  if (ids.length === 0) return { success: true, approved: 0 };
  try {
    return (await adminTaxonomySubmissions.bulkApprove(ids)) as {
      success: boolean;
      error?: string;
      approved: number;
    };
  } catch (err) {
    return {
      success: false,
      approved: 0,
      error: err instanceof ApiError ? err.message : 'Σφάλμα δικτύου',
    };
  }
}

export async function bulkRejectTaxonomySubmissions(
  input: { ids: string[]; reason?: string },
): Promise<{ success: boolean; error?: string; rejected: number }> {
  if (input.ids.length === 0) return { success: true, rejected: 0 };
  try {
    return (await adminTaxonomySubmissions.bulkReject(input.ids, input.reason)) as {
      success: boolean;
      error?: string;
      rejected: number;
    };
  } catch (err) {
    return {
      success: false,
      rejected: 0,
      error: err instanceof ApiError ? err.message : 'Σφάλμα δικτύου',
    };
  }
}
