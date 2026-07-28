/**
 * CodeBlock Component
 *
 * Displays JSON code with proper formatting and visual highlighting
 * Shows condensed tree structure with muted background for regular items
 * and Greek green highlight for new/updated/deleted items
 */

'use client';

import { diffLines } from 'diff';
import { useMemo, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import type { TaxonomyLevel, TaxonomyType } from '@/lib/types/taxonomy-operations';
import type { DatasetItem } from '@/lib/types/datasets';
import { getTaxonomyData } from '@/actions/admin/taxonomy-helpers';
import {
  buildCreateTreePreview,
  buildUpdateTreePreview,
  buildDeleteTreePreview,
  processJsonForDisplay,
} from '@/lib/taxonomy-tree-preview';

interface CodeBlockProps {
  /** JSON object to display */
  data: Record<string, any>;
  /** Previous data for diff comparison (update operations only) */
  previousData?: Record<string, any>;
  /** Operation type affects styling */
  operation: 'create' | 'update' | 'delete';
  /** Hierarchy level (for tree context) */
  level?: TaxonomyLevel;
  /** Parent ID (for fetching parent context) */
  parentId?: string | null;
  /** Taxonomy type (for fetching parent data) */
  taxonomyType?: TaxonomyType;
  /** Item ID (for update/delete operations) */
  itemId?: string;
}

/**
 * Format JSON with proper indentation
 */
function formatJSON(data: Record<string, any>): string {
  return JSON.stringify(data, null, 2);
}

/**
 * Compute diff between two JSON objects
 */
function computeDiff(oldData: Record<string, any>, newData: Record<string, any>) {
  const oldStr = formatJSON(oldData);
  const newStr = formatJSON(newData);

  return diffLines(oldStr, newStr);
}

/**
 * Find item by ID in taxonomy tree
 */
function findItemById(items: DatasetItem[], id: string): DatasetItem | null {
  for (const item of items) {
    if (item.id === id) {
      return item;
    }
    if (item.children) {
      const found = findItemById(item.children, id);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Render JSON with custom line-by-line highlighting
 * Applies bg-muted to regular items and bg-third/10 with border to highlighted items
 * Uses two-pass approach: first identify highlighted object boundaries, then render
 */
function JsonRenderer({ jsonString }: { jsonString: string }) {
  const lines = jsonString.split('\n');

  // First pass: Find highlighted object boundaries
  const highlightedRanges: Array<{ start: number; end: number }> = [];
  const braceStack: number[] = [];

  lines.forEach((line, index) => {
    const trimmed = line.trim();

    // Track opening braces
    if (trimmed.startsWith('{')) {
      braceStack.push(index);
    }

    // When we find __highlight property, mark the containing object
    if (line.includes('"__highlight":')) {
      // The object that contains this property started at the last opening brace
      const objectStart = braceStack[braceStack.length - 1];
      if (objectStart !== undefined) {
        // Find the closing brace for this object
        let depth = 1;
        let objectEnd = index;
        for (let i = objectStart + 1; i < lines.length; i++) {
          const currentLine = lines[i].trim();
          if (currentLine.startsWith('{')) depth++;
          if (currentLine.startsWith('}')) {
            depth--;
            if (depth === 0) {
              objectEnd = i;
              break;
            }
          }
        }
        highlightedRanges.push({ start: objectStart, end: objectEnd });
      }
    }

    // Track closing braces
    if (trimmed.startsWith('}')) {
      braceStack.pop();
    }
  });

  // Second pass: Render with highlighting
  return (
    <code>
      {lines.map((line, index) => {
        const isHighlightLine = line.includes('"__highlight":');
        const isHighlighted = highlightedRanges.some(
          (range) => index >= range.start && index <= range.end
        );

        // Hide __highlight property line
        if (isHighlightLine) {
          return null;
        }

        return (
          <div
            key={index}
            className={cn(
              'px-4 py-0.5',
              isHighlighted && 'bg-third/10 border-l-4 border-third',
              !isHighlighted && 'bg-muted'
            )}
          >
            {line}
          </div>
        );
      })}
    </code>
  );
}

export function CodeBlock({
  data,
  previousData,
  operation,
  level,
  parentId,
  taxonomyType,
  itemId,
}: CodeBlockProps) {
  const [parentItem, setParentItem] = useState<DatasetItem | null>(null);
  const [isLoadingParent, setIsLoadingParent] = useState(false);

  // Fetch parent data if we have parentId and taxonomyType
  useEffect(() => {
    async function fetchParent() {
      if (!parentId || !taxonomyType) {
        setParentItem(null);
        return;
      }

      setIsLoadingParent(true);
      try {
        const result = await getTaxonomyData(taxonomyType);
        if (result.success) {
          const found = findItemById(result.data, parentId);
          setParentItem(found);
        }
      } catch (error) {
        console.error('Failed to fetch parent item:', error);
      } finally {
        setIsLoadingParent(false);
      }
    }

    fetchParent();
  }, [parentId, taxonomyType]);

  // Compute diff for updates
  const diffResult = useMemo(() => {
    if (operation === 'update' && previousData) {
      return computeDiff(previousData, data);
    }
    return null;
  }, [operation, previousData, data]);

  // Build tree preview for CREATE
  const createPreview = useMemo(() => {
    if (operation === 'create' && !isLoadingParent) {
      const preview = buildCreateTreePreview(parentItem, data as DatasetItem);
      return processJsonForDisplay(preview);
    }
    return null;
  }, [operation, parentItem, data, isLoadingParent]);

  // Build tree preview for UPDATE
  const updatePreview = useMemo(() => {
    if (operation === 'update' && !isLoadingParent && itemId) {
      const preview = buildUpdateTreePreview(parentItem, data as DatasetItem, itemId);
      return processJsonForDisplay(preview);
    }
    return null;
  }, [operation, parentItem, data, itemId, isLoadingParent]);

  // Build tree preview for DELETE
  const deletePreview = useMemo(() => {
    if (operation === 'delete' && !isLoadingParent && itemId) {
      const preview = buildDeleteTreePreview(parentItem, data as DatasetItem, itemId);
      return processJsonForDisplay(preview);
    }
    return null;
  }, [operation, parentItem, data, itemId, isLoadingParent]);

  // Render diff view for updates
  if (operation === 'update' && diffResult) {
    return (
      <div className="space-y-4">
        {/* Show tree context if available */}
        {updatePreview && (
          <div className="relative">
            <div className="absolute top-2 right-2 text-xs text-muted-foreground z-10">
              Tree Preview
            </div>
            <pre className="text-xs overflow-x-auto rounded-md border">
              <JsonRenderer jsonString={updatePreview} />
            </pre>
          </div>
        )}

        {/* Show diff */}
        <div className="relative">
          <div className="absolute top-2 right-2 text-xs text-muted-foreground">
            Changes (Diff)
          </div>
          <pre className="text-xs overflow-x-auto p-4 bg-muted/30 rounded-md border">
            <code>
              {diffResult.map((part, index) => {
                const lineClasses = cn(
                  'block',
                  part.added && 'bg-green-500/10 text-green-600 dark:text-green-400',
                  part.removed && 'bg-red-500/10 text-red-600 dark:text-red-400'
                );

                const prefix = part.added ? '+ ' : part.removed ? '- ' : '  ';

                return (
                  <span key={index} className={lineClasses}>
                    {part.value.split('\n').map((line, lineIndex) => {
                      if (lineIndex === part.value.split('\n').length - 1 && !line) {
                        return null;
                      }
                      return (
                        <span key={lineIndex} className="block">
                          {prefix}
                          {line}
                        </span>
                      );
                    })}
                  </span>
                );
              })}
            </code>
          </pre>
        </div>
      </div>
    );
  }

  // Render tree preview for CREATE
  if (operation === 'create' && createPreview) {
    return (
      <div className="relative">
        <div className="absolute top-2 right-2 text-xs text-muted-foreground z-10">
          {parentItem ? 'Tree Preview' : 'New Item'}
        </div>
        <pre className="text-xs overflow-x-auto rounded-md border">
          <JsonRenderer jsonString={createPreview} />
        </pre>
      </div>
    );
  }

  // Render tree preview for DELETE
  if (operation === 'delete' && deletePreview) {
    return (
      <div className="relative">
        <div className="absolute top-2 right-2 text-xs text-muted-foreground z-10">
          {parentItem ? 'Tree Preview' : 'Deleted Item'}
        </div>
        <pre className="text-xs overflow-x-auto rounded-md border">
          <JsonRenderer jsonString={deletePreview} />
        </pre>
      </div>
    );
  }

  // Fallback: render just the item (for loading or no parent)
  const formattedJSON = formatJSON(data);

  return (
    <div className="relative">
      <div className="absolute top-2 right-2 text-xs text-muted-foreground z-10">
        {operation === 'create' ? 'New Item' : 'Deleted Item'}
      </div>
      <pre className="text-xs overflow-x-auto p-4 rounded-md border bg-muted">
        <code>{formattedJSON}</code>
      </pre>
    </div>
  );
}
