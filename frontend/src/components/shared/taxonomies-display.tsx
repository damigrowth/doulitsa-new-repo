import React from 'react';
import { ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface TaxonomiesDisplayProps {
  taxonomyLabels?: {
    category: string;
    subcategory: string;
    subdivision?: string;
  };
  className?: string;
  compact?: boolean;
  variant?: 'text' | 'badge';
}

export default function TaxonomiesDisplay({
  taxonomyLabels,
  className,
  compact = false,
  variant = 'text',
}: TaxonomiesDisplayProps) {
  // Handle undefined taxonomyLabels
  if (!taxonomyLabels) {
    return (
      <span className={cn('text-gray-500 text-sm italic', className)}>
        Χωρίς κατηγορία
      </span>
    );
  }

  const { category, subcategory, subdivision } = taxonomyLabels;

  // Build hierarchy array, filtering out empty values
  const hierarchy = [category, subcategory, subdivision].filter(
    (item) => item && item.trim() !== '',
  );

  if (hierarchy.length === 0) {
    return (
      <span className={cn('text-gray-500 text-sm italic', className)}>
        Χωρίς κατηγορία
      </span>
    );
  }

  if (variant === 'badge') {
    // Show only the deepest level (most specific taxonomy)
    const deepest = hierarchy[hierarchy.length - 1];

    return (
      <Badge
        variant='muted'
        className={cn(
          'rounded-full border-transparent bg-primary text-primary-foreground font-medium',
          className,
        )}
      >
        {deepest}
      </Badge>
    );
  }

  if (compact) {
    // Compact mode: show all categories separated by dashes
    return (
      <div className={cn('text-2sm text-gray-600', className)}>
        {hierarchy.join(' - ')}
      </div>
    );
  }

  // Full breadcrumb display
  return (
    <div className={cn('flex items-center gap-1 text-sm', className)}>
      {hierarchy.map((item, index) => (
        <React.Fragment key={index}>
          <span
            className={cn(
              'truncate',
              index === hierarchy.length - 1
                ? 'text-gray-900 font-medium'
                : 'text-gray-600',
            )}
            title={item}
          >
            {item}
          </span>
          {index < hierarchy.length - 1 && (
            <ChevronRight className='w-3 h-3 text-gray-400 flex-shrink-0' />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}
