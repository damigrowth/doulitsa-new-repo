import React from 'react';
import { Edit, Eye } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/utils/date';
import { Status } from '@/lib/prisma-types';
import TableMedia from '@/components/shared/table-media';
import ServiceStatusBadge from './service-status-badge';
import TaxonomiesDisplay from '../../shared/taxonomies-display';
import ServiceTableHeaderSort from './service-table-header-sort';
import ServiceRefreshButton from './service-refresh-button';
import FeaturedStarButton from './featured-star-button';
import CreateServiceButton from './create-service-button';
import type {
  UserServiceTableData,
  ServiceSortField,
  SortOrder,
} from '@/lib/types/services';
import { NextLink } from '@/components';

interface ServiceTableProps {
  services: UserServiceTableData[];
  currentSort: {
    field: ServiceSortField;
    order: SortOrder;
  };
  canFeatureMore: boolean;
  canCreateMore: boolean;
  className?: string;
}

export default function ServiceTable({
  services,
  currentSort,
  canFeatureMore,
  canCreateMore,
  className,
}: ServiceTableProps) {
  // Empty state
  if (services.length === 0) {
    return (
      <div className={cn('rounded-md border overflow-x-auto', className)}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className='w-[40%] text-base font-semibold'>
                Υπηρεσία
              </TableHead>
              <TableHead className='w-[28%] text-base font-semibold'>
                Κατηγορία
              </TableHead>
              <TableHead className='w-[12%] text-base font-semibold'>
                Κατάσταση
              </TableHead>
              <TableHead className='w-[12%] text-base font-semibold'>
                Ενημέρωση
              </TableHead>
              <TableHead className='w-[8%]'></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell colSpan={5} className='text-center py-12'>
                <div className='flex flex-col items-center justify-center space-y-3'>
                  <div className='w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center'>
                    <Edit className='w-6 h-6 text-gray-400' />
                  </div>
                  <div className='space-y-1'>
                    <h5 className='font-medium text-gray-900'>
                      Δεν έχεις υπηρεσίες ακόμα
                    </h5>
                    <p className='text-sm text-gray-500'>
                      Δημιούργησε την πρώτη σου υπηρεσία για να ξεκινήσεις
                    </p>
                  </div>
                  <CreateServiceButton canCreateMore={canCreateMore}>
                    Δημιουργία Υπηρεσίας
                  </CreateServiceButton>
                </div>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    );
  }

  return (
    <div className={cn('rounded-md border overflow-x-auto', className)}>
      <Table className='min-w-[700px]'>
        <TableHeader>
          <TableRow>
            <ServiceTableHeaderSort
              field='title'
              currentSort={currentSort}
              className='w-[40%] text-base font-semibold'
            >
              Υπηρεσία
            </ServiceTableHeaderSort>
            <ServiceTableHeaderSort
              field='category'
              currentSort={currentSort}
              className='w-[28%] text-base font-semibold'
            >
              Κατηγορία
            </ServiceTableHeaderSort>
            <ServiceTableHeaderSort
              field='status'
              currentSort={currentSort}
              className='w-[12%] text-base font-semibold'
            >
              Κατάσταση
            </ServiceTableHeaderSort>
            <ServiceTableHeaderSort
              field='updatedAt'
              currentSort={currentSort}
              className='w-[12%] text-base font-semibold'
            >
              Ενημέρωση
            </ServiceTableHeaderSort>
            <TableHead className='w-[8%]'></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {services.map((service) => (
            <TableRow key={service.id} className='hover:bg-gray-50'>
              {/* Service Column */}
              <TableCell>
                <div className='flex items-center gap-3'>
                  {/* Media Thumbnail */}
                  <TableMedia media={service.media || []} />

                  {/* Title and Info */}
                  <div className='flex-1 min-w-0'>
                    <NextLink href={`/dashboard/services/edit/${service.id}`}>
                      <h3 className='text-2sm font-medium text-gray-900 break-all line-clamp-3 hover:text-primary hover:underline cursor-pointer transition-colors'>
                        {service.title}
                      </h3>
                    </NextLink>
                  </div>
                </div>
              </TableCell>

              {/* Category Column */}
              <TableCell>
                <TaxonomiesDisplay
                  taxonomyLabels={service.taxonomyLabels}
                  compact
                />
              </TableCell>

              {/* Status Column */}
              <TableCell>
                <ServiceStatusBadge status={service.status as Status} />
              </TableCell>

              {/* Updated Date Column - NOW WITH REFRESH BUTTON */}
              <TableCell>
                <ServiceRefreshButton
                  serviceId={service.id}
                  refreshedAt={service.refreshedAt}
                  isPublished={service.status === Status.published}
                />
              </TableCell>

              {/* Actions Column */}
              <TableCell className='text-right'>
                <div className='flex items-center justify-end gap-1'>
                  <FeaturedStarButton
                    serviceId={service.id}
                    featured={service.featured}
                    canFeatureMore={canFeatureMore}
                    isPublished={service.status === Status.published}
                  />
                  {service.status === Status.published && service.slug && (
                    <Button
                      variant='ghost'
                      size='icon'
                      className='h-8 w-8'
                      asChild
                    >
                      <NextLink href={`/s/${service.slug}`} target='_blank'>
                        <Eye className='w-4 h-4' />
                      </NextLink>
                    </Button>
                  )}
                  <Button
                    variant='ghost'
                    size='icon'
                    className='h-8 w-8'
                    asChild
                  >
                    <NextLink href={`/dashboard/services/edit/${service.id}`}>
                      <Edit className='w-4 h-4' />
                    </NextLink>
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
