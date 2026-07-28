import React from 'react';
import { Clock, MapPin, Globe, Users } from 'lucide-react';
import { DatasetItem } from '@/lib/types/datasets';
import {
  getCoverageGroupedByCounty,
  getCoverageAddressWithLocation,
} from '@/lib/utils/datasets';
import IconBox from '@/components/shared/icon-box';
import { FlaticonCategory, FlaticonRefresh } from '@/components/icon';
import CoverageDisplay from '@/components/shared/coverage-display';

interface ServiceInfoProps {
  coverage: ReturnType<
    typeof import('@/lib/utils/datasets').transformCoverageWithLocationNames
  >;
  category?: DatasetItem;
  subcategory?: DatasetItem;
  subdivision?: DatasetItem;
  duration?: number;
  type?: AppJson.ServiceType;
  subscriptionType?: string;
  className?: string;
}

export default function ServiceInfo({
  coverage,
  category,
  subcategory,
  subdivision,
  duration,
  type,
  subscriptionType,
  className = '',
}: ServiceInfoProps) {
  const { online, onbase, onsite, presence, oneoff, subscription } = type || {};

  // Get grouped coverage once at the top
  const groupedCoverage = getCoverageGroupedByCounty(coverage);

  return (
    <div
      className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 ${className}`}
    >
      {category && (
        <div className='group sm:col-span-1 md:col-span-1'>
          <IconBox
            icon={<FlaticonCategory size={40} />}
            iconVariant='brand'
            title={subdivision?.label || ''}
            value={
              <h2 className='text-sm font-semibold text-muted-foreground mb-0'>
                {subcategory?.label}
              </h2>
            }
          />
        </div>
      )}

      {online && (
        <div className='group sm:col-span-1 md:col-span-1'>
          <IconBox
            icon={<Globe className='h-10 w-10' />}
            iconVariant='brand'
            title='Εξυπηρετεί'
            valueClassName='font-semibold'
            value={
              <div className='flex items-center gap-2'>
                <span className='w-2 h-2 bg-green-500 rounded-full mt-0.5'></span>
                <span>Online</span>
              </div>
            }
          />
        </div>
      )}

      {online && subscription && subscriptionType && (
        <div className='group sm:col-span-1 md:col-span-1'>
          <IconBox
            icon={<FlaticonRefresh size={40} />}
            iconVariant='brand'
            title='Πληρωμή'
            valueClassName='font-semibold'
            value={
              {
                month: 'Μηνιαία',
                year: 'Ετήσια',
                per_case: 'Κατά περίπτωση',
                per_hour: 'Ανά Ώρα',
                per_session: 'Ανά Συνεδρία',
              }[subscriptionType] || 'Άγνωστο'
            }
          />
        </div>
      )}

      {online && oneoff && !subscription && duration > 0 && (
        <div className='group sm:col-span-1 md:col-span-1'>
          <IconBox
            icon={<Clock className='h-10 w-10' />}
            iconVariant='brand'
            title='Ημέρες παράδοσης'
            valueClassName='font-semibold'
            value={
              'Έως ' + duration
            }
          />
        </div>
      )}

      {presence && onbase && coverage?.onbase && coverage?.address && (
        <div className='group sm:col-span-2 md:col-span-2'>
          <IconBox
            icon={<MapPin className='h-10 w-10' />}
            iconVariant='brand'
            title='Διεύθυνση'
            valueClassName='font-semibold'
            value={getCoverageAddressWithLocation(coverage)}
          />
        </div>
      )}

      {presence && onsite && coverage?.onsite && groupedCoverage.length > 0 && (
        <div className='group sm:col-span-2 md:col-span-2'>
          <IconBox
            icon={<Users className='h-10 w-10' />}
            iconVariant='brand'
            title='Περιοχές Εξυπηρέτησης'
            valueClassName='font-semibold'
            value={<CoverageDisplay groupedCoverage={groupedCoverage} />}
          />
        </div>
      )}
    </div>
  );
}
