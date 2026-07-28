/**
 * Pending Change Item Component
 *
 * Individual expandable card for a pending taxonomy change
 * Shows summary when collapsed, code view when expanded
 */

'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import type { TaxonomyDraft } from '@/lib/types/taxonomy-operations';
import { CodeBlock } from './code-block';

interface PendingChangeItemProps {
  draft: TaxonomyDraft;
}

/**
 * Get border color based on operation type
 */
function getOperationBorderColor(operation: 'create' | 'update' | 'delete'): string {
  switch (operation) {
    case 'create':
      return 'border-l-green-500';
    case 'update':
      return 'border-l-blue-500';
    case 'delete':
      return 'border-l-red-500';
  }
}

/**
 * Get item label from draft data
 */
function getItemLabel(draft: TaxonomyDraft): string {
  switch (draft.operation) {
    case 'create':
      return draft.data.label || draft.data.name || 'Unnamed Item';
    case 'update':
      return draft.data.label || draft.data.name || 'Unnamed Item';
    case 'delete':
      return draft.deletedData.label || draft.deletedData.name || 'Unnamed Item';
  }
}

export function PendingChangeItem({ draft }: PendingChangeItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const itemLabel = getItemLabel(draft);
  const borderColor = getOperationBorderColor(draft.operation);
  const timestamp = formatDistanceToNow(draft.createdAt, { addSuffix: true });

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <Card className={cn('border-l-4 transition-colors', borderColor)}>
        <CollapsibleTrigger className="w-full text-left">
          <div className="p-4 hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between gap-3">
              <h4 className="font-medium text-sm truncate flex-1 min-w-0">{itemLabel}</h4>
              <div className="flex items-center gap-3 flex-shrink-0">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>{timestamp}</span>
                </div>
                <div className="text-muted-foreground">
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </div>
              </div>
            </div>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-4 pb-4 pt-2 border-t">
            {draft.operation === 'create' && (
              <CodeBlock
                data={draft.data}
                operation="create"
                level={draft.level}
                parentId={draft.parentId}
                taxonomyType={draft.taxonomyType}
              />
            )}

            {draft.operation === 'update' && (
              <CodeBlock
                data={draft.data}
                previousData={draft.previousData}
                operation="update"
                taxonomyType={draft.taxonomyType}
                itemId={draft.itemId}
              />
            )}

            {draft.operation === 'delete' && (
              <CodeBlock
                data={draft.deletedData}
                operation="delete"
                taxonomyType={draft.taxonomyType}
                itemId={draft.itemId}
              />
            )}
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
