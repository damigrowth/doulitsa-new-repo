/**
 * Pending Changes List Component
 *
 * Displays detailed list of pending taxonomy changes
 * grouped by taxonomy type with expandable code view
 */

'use client';

import type { TaxonomyDraft, TaxonomyType } from '@/lib/types/taxonomy-operations';
import { PendingChangeItem } from './pending-change-item';

interface PendingChangesListProps {
  drafts: TaxonomyDraft[];
}

// Taxonomy type display names
const TAXONOMY_LABELS: Record<TaxonomyType, string> = {
  'service-categories': 'Service Categories',
  'service-subcategories': 'Service Subcategories',
  'service-subdivisions': 'Service Subdivisions',
  'pro-categories': 'Pro Categories',
  'pro-subcategories': 'Pro Subcategories',
  tags: 'Tags',
  skills: 'Skills',
};

/**
 * Group drafts by taxonomy type
 */
function groupDraftsByType(drafts: TaxonomyDraft[]): Map<TaxonomyType, TaxonomyDraft[]> {
  const grouped = new Map<TaxonomyType, TaxonomyDraft[]>();

  for (const draft of drafts) {
    const existing = grouped.get(draft.taxonomyType) || [];
    grouped.set(draft.taxonomyType, [...existing, draft]);
  }

  // Sort drafts within each group by createdAt (oldest first)
  for (const [type, typeDrafts] of grouped) {
    grouped.set(
      type,
      typeDrafts.sort((a, b) => a.createdAt - b.createdAt)
    );
  }

  return grouped;
}

export function PendingChangesList({ drafts }: PendingChangesListProps) {
  const groupedDrafts = groupDraftsByType(drafts);

  if (drafts.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      {Array.from(groupedDrafts).map(([type, typeDrafts]) => (
        <div key={type} className="space-y-3">
          <h3 className="font-semibold text-sm text-foreground">
            {TAXONOMY_LABELS[type]}
            <span className="ml-2 text-muted-foreground font-normal">
              ({typeDrafts.length} {typeDrafts.length === 1 ? 'change' : 'changes'})
            </span>
          </h3>
          <div className="space-y-2">
            {typeDrafts.map((draft) => (
              <PendingChangeItem key={draft.id} draft={draft} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
