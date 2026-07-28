'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, MapPin } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import SharedCoverageDisplay from '@/components/shared/coverage-display';

interface CoverageDisplayProps {
  variant?: 'compact' | 'full';
  className?: string;
  // Service type booleans to control what coverage to show
  online?: boolean;
  onbase?: boolean;
  onsite?: boolean;
  // Coverage location data (for onbase display)
  area?: string | null;
  county?: string | null;
  // Pre-computed grouped coverage from server (required for onsite)
  groupedCoverage: Array<{ county: string; areas: string[] }>;
}

export function CoverageDisplay({
  variant = 'compact',
  className,
  online,
  onbase,
  onsite,
  area,
  county,
  groupedCoverage,
}: CoverageDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Show nothing if no coverage info
  if (!online && !onbase && !onsite) {
    return null;
  }

  const totalAreas = groupedCoverage.reduce(
    (sum, item) => sum + item.areas.length,
    0,
  );

  // Get the coverage text based on type
  // Priority: Show location first (onbase or onsite), then append "& Online" if applicable
  const getCoverageText = () => {
    // Priority 1: Onbase only (own location) - show area, county + online if applicable
    // When onsite is also enabled, the onsite counties already include the base
    // location, so we fall through to the onsite phrasing instead
    // (unless no counties are recorded, where the base location is all we have).
    if (onbase && (!onsite || groupedCoverage.length === 0)) {
      const areaName = area || '';
      const countyName = county || '';

      // Avoid duplication: if area and county are the same, show only county
      const locationText = areaName && countyName && areaName !== countyName
        ? `${areaName}, ${countyName}`
        : countyName || areaName;

      return online
        ? `Εξυπηρετεί: Online & ${locationText}`
        : `Εξυπηρετεί: ${locationText}`;
    }

    // Priority 2: Onsite (client location) - show counties + online if applicable
    if (onsite && groupedCoverage.length > 0) {
      const COUNTY_DISPLAY_LIMIT = 5;

      // Nationwide coverage: no county listing, just "Πανελλαδικά"
      // (label matches the Πανελλαδικά option in the locations dataset)
      if (groupedCoverage.some((item) => item.county === 'Πανελλαδικά')) {
        return `Εξυπηρετεί: ${online ? 'Online & ' : ''}Πανελλαδικά`;
      }

      // Too many counties: collapse to a count
      if (groupedCoverage.length > COUNTY_DISPLAY_LIMIT) {
        return (
          <>
            Εξυπηρετεί: {online && 'Online & '}περιοχές σε{' '}
            {groupedCoverage.length} νομούς
          </>
        );
      }

      return (
        <>
          Εξυπηρετεί: {online && 'Online & '}περιοχές{' '}
          {groupedCoverage.map((item, index) => (
            <React.Fragment key={item.county}>
              {index > 0 && ', '}
              {item.county}
            </React.Fragment>
          ))}
        </>
      );
    }

    // Priority 3: Online only (fallback when no physical location)
    if (online) {
      return 'Εξυπηρετεί: Online';
    }

    return null;
  };

  const COUNTY_DISPLAY_LIMIT = 5;
  const coverageText = getCoverageText();
  // Show expand button only when onsite and the inline text hides information:
  // >5 counties (collapsed to a count) or specific areas to reveal.
  // Never for onbase-only: groupedCoverage may carry the profile's onsite
  // counties, which are irrelevant when this service is not onsite.
  const showExpandButton =
    onsite && (groupedCoverage.length > COUNTY_DISPLAY_LIMIT || totalAreas > 0);

  if (!coverageText) {
    return null;
  }

  return (
    <div className={cn('space-y-2', className)}>
      {/* Coverage Text */}
      <div className='text-sm text-gray-600'>
        {showExpandButton ? (
          <Popover open={isExpanded} onOpenChange={setIsExpanded}>
            <div className='flex items-start gap-1.5'>
              <MapPin className='w-4 h-4 shrink-0 mt-1' />
              <PopoverTrigger asChild>
                <button className='text-left hover:text-gray-900 transition-colors cursor-pointer'>
                  <span>{coverageText}</span>
                  {isExpanded ? (
                    <ChevronUp className='w-4 h-4 inline ml-1' />
                  ) : (
                    <ChevronDown className='w-4 h-4 inline ml-1' />
                  )}
                </button>
              </PopoverTrigger>
            </div>

            <PopoverContent
              align='start'
              side='bottom'
              sideOffset={8}
              className='w-80 p-3'
            >
              <div className='text-sm text-gray-700'>
                <SharedCoverageDisplay groupedCoverage={groupedCoverage} collapse={false} />
              </div>
            </PopoverContent>
          </Popover>
        ) : (
          <div className='flex items-start gap-1.5'>
            <MapPin className='w-4 h-4 shrink-0 mt-1' />
            {coverageText}
          </div>
        )}
      </div>
    </div>
  );
}
