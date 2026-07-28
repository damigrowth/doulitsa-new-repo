/**
 * Taxonomy Submission ID utilities
 *
 * User-submitted skills/tags awaiting admin approval use a prefixed ID
 * scheme: "pending_<cuid>" to distinguish them from real numeric IDs
 * in Profile.skills[] and Service.tags[].
 */

export const PENDING_PREFIX = 'pending_';

/**
 * Check if an ID is a taxonomy submission ID
 */
export function isTaxonomySubmissionId(id: string): boolean {
  return id.startsWith(PENDING_PREFIX);
}

/**
 * Extract the TaxonomySubmission database record ID from a submission ID
 * e.g. "pending_cm1abc2de3fg" → "cm1abc2de3fg"
 */
export function getSubmissionRecordId(submissionId: string): string {
  return submissionId.replace(PENDING_PREFIX, '');
}

/**
 * Create a submission ID from a TaxonomySubmission database record ID
 * e.g. "cm1abc2de3fg" → "pending_cm1abc2de3fg"
 */
export function createSubmissionId(recordId: string): string {
  return `${PENDING_PREFIX}${recordId}`;
}
