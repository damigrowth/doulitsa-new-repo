import React from 'react';
import { MapPin } from 'lucide-react';
import type { ProfileMetricsProps } from '@/lib/types/components';
import IconBox from '@/components/shared/icon-box';
import { FlaticonCategory } from '@/components/icon';
import { Badge } from '../ui/badge';
import ProfileSubdivisionsWrapper from './profile-subdivisions-wrapper';
import CoverageDisplay from '../shared/coverage-display';
import {
  getCoverageGroupedByCounty,
  hasOnsiteCoverage,
} from '@/lib/utils/datasets';

/**
 * Modern ProfileMetrics Component
 * Displays key metrics about the profile (services subdivisions, service areas)
 */

export default function ProfileMetrics({
  serviceSubdivisions,
  coverage,
}: ProfileMetricsProps) {
  const groupedCoverage = coverage ? getCoverageGroupedByCounty(coverage) : [];
  const hasServiceAreas =
    coverage && hasOnsiteCoverage(coverage) && groupedCoverage.length > 0;

  const hasAnyMetric =
    (serviceSubdivisions && serviceSubdivisions.length > 0) || hasServiceAreas;

  if (!hasAnyMetric) {
    return null;
  }

  return (
    <section className='grid grid-cols-1 md:grid-cols-2 gap-6'>
      {/* Service Subdivisions */}
      {serviceSubdivisions && serviceSubdivisions.length > 0 && (
        <ProfileSubdivisionsWrapper>
          <IconBox
            icon={<FlaticonCategory size={16} className='h-4 w-4' />}
            iconSize='sm'
            iconVariant='brand'
            title='Υπηρεσίες'
            titleClassName='mb-3'
            value={
              <div className='flex flex-wrap gap-1.5'>
                {serviceSubdivisions
                  .filter((subdivision) => subdivision && subdivision.label)
                  .map((subdivision) => (
                    <Badge
                      key={subdivision.id}
                      variant='outline'
                      className='inline-block text-2sm font-medium py-1 px-2.5 text-center bg-primary/10 text-primary border-none rounded-full cursor-pointer'
                    >
                      {subdivision.label}
                    </Badge>
                  ))}
              </div>
            }
          />
        </ProfileSubdivisionsWrapper>
      )}

      {/* Service Areas (Περιοχές Εξυπηρέτησης) */}
      {hasServiceAreas && (
        <IconBox
          icon={<MapPin className='h-4 w-4' />}
          iconSize='sm'
          iconVariant='brand'
          title='Περιοχές Εξυπηρέτησης'
          titleClassName='mb-3'
          value={<CoverageDisplay groupedCoverage={groupedCoverage} />}
        />
      )}
    </section>
  );
}
