'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

const COUNTY_COLLAPSE_THRESHOLD = 5;

interface CoverageDisplayProps {
  groupedCoverage: Array<{ county: string; areas: string[] }>;
  /** When false, always renders the full inline list (no popover). Default: true */
  collapse?: boolean;
}

/**
 * Shared coverage display for service & profile detail pages.
 *
 * - Shows county names only (no areas inline)
 * - < 5 counties with areas: names + chevron → popover with full details
 * - < 5 counties no areas: names only, no popover
 * - 5+ counties: "X Νομοί" + chevron → popover with full details
 * - collapse={false}: renders full inline list (used inside archive popover)
 */
export default function CoverageDisplay({
  groupedCoverage,
  collapse = true,
}: CoverageDisplayProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!groupedCoverage || groupedCoverage.length === 0) {
    return null;
  }

  const totalAreas = groupedCoverage.reduce(
    (sum, item) => sum + item.areas.length,
    0,
  );
  const hasAreas = totalAreas > 0;
  const countyCount = groupedCoverage.length;

  // Full detailed list: County (Area1, Area2), County2 (Area3)
  const fullList = (
    <>
      {groupedCoverage.map((item, index) => (
        <React.Fragment key={item.county}>
          {index > 0 && ', '}
          <strong>{item.county}</strong>
          {item.areas.length > 0 && (
            <span className='font-normal'> ({item.areas.join(', ')})</span>
          )}
        </React.Fragment>
      ))}
    </>
  );

  // When collapse is disabled, render full list inline (for archive popover inner usage)
  if (!collapse) {
    return fullList;
  }

  // Determine display mode
  const shouldCollapse = countyCount >= COUNTY_COLLAPSE_THRESHOLD;

  // Inline label: county names or "X Νομοί"
  const inlineLabel = shouldCollapse ? (
    <>{countyCount} Νομοί</>
  ) : (
    <>
      {groupedCoverage.map((item, index) => (
        <React.Fragment key={item.county}>
          {index > 0 && ', '}
          {item.county}
        </React.Fragment>
      ))}
    </>
  );

  // Show popover when: 5+ counties OR has areas to reveal
  const showPopover = shouldCollapse || hasAreas;

  if (!showPopover) {
    return <span>{inlineLabel}</span>;
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          type='button'
          className='text-left hover:text-gray-900 transition-colors cursor-pointer inline-flex items-center'
        >
          <span>{inlineLabel}</span>
          {isOpen ? (
            <ChevronUp className='w-4 h-4 inline ml-1' />
          ) : (
            <ChevronDown className='w-4 h-4 inline ml-1' />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align='start'
        side='bottom'
        sideOffset={8}
        className='max-w-80 max-h-64 overflow-y-auto text-sm font-medium text-muted-foreground'
      >
        {fullList}
      </PopoverContent>
    </Popover>
  );
}
