'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Globe,
  FileText,
  XCircle,
  Clock,
  Star,
  ExternalLink,
  Edit,
} from 'lucide-react';
import { formatDate, formatTime } from '@/lib/utils/date';
import { Status } from '@/lib/prisma-types';
import TableMedia from '@/components/shared/table-media';
import TaxonomiesDisplay from '@/components/shared/taxonomies-display';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip';
import { AdminDataTable, ColumnDef } from './admin-data-table';
import type { AdminServiceRow } from '@/lib/types/admin';
import { NextLink } from '@/components';

interface AdminServicesDataTableProps {
  data: AdminServiceRow[];
  loading?: boolean;
  basePath?: string;
}

// Status badges component
function ServiceStatusBadges({
  status,
  featured,
}: {
  status: Status;
  featured: boolean;
}) {
  return (
    <div className='flex items-center gap-2'>
      {status === 'published' && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Globe className='h-5 w-5 text-green-600 cursor-pointer' />
          </TooltipTrigger>
          <TooltipContent>
            <p>Published</p>
          </TooltipContent>
        </Tooltip>
      )}
      {status === 'draft' && (
        <Tooltip>
          <TooltipTrigger asChild>
            <FileText className='h-5 w-5 text-gray-500 cursor-pointer' />
          </TooltipTrigger>
          <TooltipContent>
            <p>Draft</p>
          </TooltipContent>
        </Tooltip>
      )}
      {status === 'pending' && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Clock className='h-5 w-5 text-yellow-600 cursor-pointer' />
          </TooltipTrigger>
          <TooltipContent>
            <p>Pending Approval</p>
          </TooltipContent>
        </Tooltip>
      )}
      {status === 'rejected' && (
        <Tooltip>
          <TooltipTrigger asChild>
            <XCircle className='h-5 w-5 text-red-600 cursor-pointer' />
          </TooltipTrigger>
          <TooltipContent>
            <p>Rejected</p>
          </TooltipContent>
        </Tooltip>
      )}
      {featured && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Star className='h-5 w-5 text-yellow-500 fill-yellow-500 cursor-pointer' />
          </TooltipTrigger>
          <TooltipContent>
            <p>Featured</p>
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}

export function AdminServicesDataTable({
  data,
  loading = false,
  basePath = '/admin/services',
}: AdminServicesDataTableProps) {
  const formatPrice = (price: number | null) => {
    if (price === null) return 'N/A';
    return `${price}€`;
  };

  const columns: ColumnDef<AdminServiceRow>[] = [
    {
      key: 'title',
      header: 'Υπηρεσία',
      // Note: title sorting not supported by backend - requires full-text search
      className: 'max-w-[480px]',
      render: (service) => (
        <div className='flex items-center gap-3'>
          <TableMedia media={service.media || []} />
          <div className='flex-1 min-w-0'>
            <NextLink
              href={`/admin/services/${service.id}`}
              className='min-w-0'
            >
              <h3 className='text-sm font-medium text-gray-900 truncate hover:text-primary hover:underline cursor-pointer transition-colors'>
                {service.title}
              </h3>
            </NextLink>
            <p className='text-xs text-muted-foreground'>
              by{' '}
              <NextLink
                href={`/admin/profiles/${service.profile?.id ?? ''}`}
                className='hover:text-primary hover:underline transition-colors'
              >
                {service.profile?.displayName ||
                  service.profile?.username ||
                  '—'}
              </NextLink>
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Κατηγορία',
      // Note: category sorting not supported - use filters instead
      className: 'max-w-[200px]',
      render: (service) =>
        service.taxonomyLabels ? (
          <TaxonomiesDisplay taxonomyLabels={service.taxonomyLabels} compact />
        ) : (
          <Badge variant='outline' className='text-xs w-fit'>
            {service.category}
          </Badge>
        ),
    },
    {
      key: 'price',
      header: 'Τιμή',
      sortable: true,
      render: (service) => (
        <div className='font-medium'>{formatPrice(service.price)}</div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      // Note: status sorting not supported - use filters instead
      render: (service) => (
        <ServiceStatusBadges
          status={service.status as Status}
          featured={service.featured}
        />
      ),
    },
    {
      key: 'createdAt',
      header: 'Created',
      sortable: true,
      render: (service) => (
        <div className='text-sm text-muted-foreground'>
          <div>{service.createdAt ? formatDate(service.createdAt) : '—'}</div>
          <div className='text-xs'>
            {service.createdAt ? formatTime(service.createdAt) : ''}
          </div>
        </div>
      ),
    },
    {
      key: 'updatedAt',
      header: 'Updated',
      sortable: true,
      render: (service) => (
        <div className='text-sm text-muted-foreground'>
          <div>{service.updatedAt ? formatDate(service.updatedAt) : '—'}</div>
          <div className='text-xs'>
            {service.updatedAt ? formatTime(service.updatedAt) : ''}
          </div>
        </div>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (service) => (
        <div className='flex items-center justify-end gap-1'>
          {/* View service button - only for published services */}
          {service.status === 'published' && service.slug && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant='ghost' size='icon' className='h-8 w-8' asChild>
                  <NextLink
                    href={`/s/${service.slug}`}
                    target='_blank'
                    rel='noopener noreferrer'
                  >
                    <ExternalLink className='w-4 h-4' />
                  </NextLink>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Προβολή Υπηρεσίας</p>
              </TooltipContent>
            </Tooltip>
          )}
          {/* Edit service button - always visible */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant='ghost' size='icon' className='h-8 w-8' asChild>
                <NextLink href={`${basePath}/${service.id}`}>
                  <Edit className='w-4 h-4' />
                </NextLink>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Επεξεργασία Υπηρεσίας</p>
            </TooltipContent>
          </Tooltip>
        </div>
      ),
    },
  ];

  return (
    <AdminDataTable
      data={data}
      columns={columns}
      loading={loading}
      basePath={basePath}
      emptyMessage='No services found matching your criteria.'
      skeletonRows={5}
    />
  );
}
