'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getSortedRowModel,
  SortingState,
} from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { NextLink } from '@/components';
import UserAvatar from '@/components/shared/user-avatar';
import { ArrowUpDown, Edit, Copy, Check, Star } from 'lucide-react';
import { formatDate, formatTime } from '@/lib/utils/date';
import { cn } from '@/lib/utils';

import type { AdminReviewRow } from '@/lib/types/admin';

interface AdminReviewsDataTableProps {
  data: AdminReviewRow[];
  loading?: boolean;
}

// CopyableText component
function CopyableText({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={cn(
        'group flex items-center gap-2 cursor-pointer hover:text-primary transition-colors',
        className,
      )}
      onClick={handleCopy}
    >
      <span className='text-sm font-mono'>{text}</span>
      {copied ? (
        <Check className='h-3 w-3 text-green-600' />
      ) : (
        <Copy className='h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity' />
      )}
    </div>
  );
}

export function AdminReviewsDataTable({
  data,
  loading = false,
}: AdminReviewsDataTableProps) {
  const router = useRouter();
  const [sorting, setSorting] = React.useState<SortingState>([]);

  // Helper function for status badge
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'approved':
        return 'default' as const; // Green
      case 'rejected':
        return 'destructive' as const; // Red
      case 'pending':
        return 'outline' as const; // Yellow
      default:
        return 'outline' as const;
    }
  };

  // Helper function for status badge className
  const getStatusBadgeClassName = (status: string) => {
    if (status === 'pending') {
      return 'border-yellow-500 text-yellow-600 bg-yellow-50';
    }
    return '';
  };

  // Column definitions
  const columns: ColumnDef<AdminReviewRow>[] = [
    {
      accessorKey: 'status',
      header: ({ column }) => {
        return (
          <Button
            variant='ghost'
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className='h-auto p-0'
          >
            Status
            <ArrowUpDown className='ml-2 h-4 w-4' />
          </Button>
        );
      },
      cell: ({ row }) => {
        const status = row.original.status;
        return (
          <Badge
            variant={getStatusBadgeVariant(status)}
            className={getStatusBadgeClassName(status)}
          >
            {status}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'rating',
      header: ({ column }) => {
        return (
          <Button
            variant='ghost'
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className='h-auto p-0'
          >
            Rating
            <ArrowUpDown className='ml-2 h-4 w-4' />
          </Button>
        );
      },
      cell: ({ row }) => {
        const rating = row.original.rating;
        return (
          <div className='flex items-center gap-1'>
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={`h-3 w-3 ${
                  i < rating
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'text-gray-300'
                }`}
              />
            ))}
          </div>
        );
      },
    },
    {
      accessorKey: 'comment',
      header: 'Comment',
      cell: ({ row }) => {
        const comment = row.original.comment;
        return (
          <div className='max-w-[300px] truncate'>
            {comment ? (
              <span className='text-sm'>{comment}</span>
            ) : (
              <span className='text-muted-foreground text-sm italic'>
                No comment
              </span>
            )}
          </div>
        );
      },
    },
    {
      id: 'author',
      header: 'Author',
      cell: ({ row }) => {
        const review = row.original;
        const author = review.author;
        return (
          <div className='flex items-center gap-2'>
            <UserAvatar
              displayName={author?.displayName || author?.name || 'User'}
              image={author?.image}
              size='sm'
              className='h-8 w-8'
              showBorder={false}
              showShadow={false}
            />
            <div className='min-w-0'>
              <p className='font-medium truncate text-sm'>
                {author?.displayName || author?.name || 'Anonymous'}
              </p>
            </div>
          </div>
        );
      },
    },
    {
      id: 'reviewed',
      header: 'Reviewed',
      cell: ({ row }) => {
        const review = row.original;
        const profile = review.profile;
        const service = review.service;
        const isServiceReview = review.type === 'SERVICE';

        return (
          <div className='flex flex-col gap-1'>
            {isServiceReview ? (
              // For SERVICE reviews: Show service title first, then "by: displayName"
              <>
                {service && (
                  <NextLink
                    href={`/s/${service.slug}`}
                    className='hover:underline'
                  >
                    <p className='font-medium text-sm'>{service.title}</p>
                  </NextLink>
                )}
                <NextLink
                  href={`/admin/profiles/${review.pid}`}
                  className='hover:underline'
                >
                  <p className='text-xs text-muted-foreground truncate max-w-[150px]'>
                    by: {profile?.displayName || profile?.username || '—'}
                  </p>
                </NextLink>
              </>
            ) : (
              // For PROFILE reviews: Show profile displayName first, then service
              <>
                <NextLink
                  href={`/admin/profiles/${review.pid}`}
                  className='hover:underline'
                >
                  <p className='font-medium text-sm truncate max-w-[150px]'>
                    {profile?.displayName || profile?.username || '—'}
                  </p>
                </NextLink>
                {service && (
                  <NextLink
                    href={`/s/${service.slug}`}
                    className='hover:underline'
                  >
                    <p className='text-xs text-muted-foreground truncate max-w-[150px]'>
                      {service.title}
                    </p>
                  </NextLink>
                )}
              </>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'type',
      header: 'Type',
      cell: ({ row }) => {
        const type = row.original.type;
        return (
          <Badge variant='outline' className='text-xs'>
            {type}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'visibility',
      header: 'Visible',
      cell: ({ row }) => {
        const visible = row.original.visibility;
        return (
          <Badge
            variant={visible ? 'default' : 'outline'}
            className={
              visible ? 'bg-green-100 text-green-800 border-green-200' : ''
            }
          >
            {visible ? 'Yes' : 'No'}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'createdAt',
      header: ({ column }) => {
        return (
          <Button
            variant='ghost'
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className='h-auto p-0'
          >
            Created
            <ArrowUpDown className='ml-2 h-4 w-4' />
          </Button>
        );
      },
      cell: ({ row }) => {
        const date = row.getValue('createdAt') as Date;
        return (
          <div className='text-sm text-muted-foreground'>
            <div>{formatDate(date)}</div>
            <div className='text-xs'>{formatTime(date)}</div>
          </div>
        );
      },
    },
    {
      id: 'actions',
      enableHiding: false,
      cell: ({ row }) => {
        const review = row.original;

        return (
          <Button
            variant='ghost'
            size='icon'
            onClick={() => router.push(`/admin/reviews/${review.id}`)}
          >
            <Edit className='h-4 w-4' />
            <span className='sr-only'>Edit</span>
          </Button>
        );
      },
    },
  ];

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: {
      sorting,
    },
  });

  if (loading) {
    return (
      <div className='flex items-center justify-center p-8'>
        <div className='text-muted-foreground'>Loading reviews...</div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className='flex items-center justify-center p-8'>
        <div className='text-center'>
          <p className='text-muted-foreground'>No reviews found</p>
          <p className='text-sm text-muted-foreground mt-1'>
            Try adjusting your filters
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className='rounded-md border'>
      <Table className='[&_th:first-child]:pl-4 [&_td:first-child]:pl-4 [&_th:last-child]:pr-4 [&_td:last-child]:pr-4'>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                return (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                className='cursor-pointer hover:bg-muted/50'
                onClick={(e) => {
                  const target = e.target as HTMLElement;
                  if (
                    target.closest('button') ||
                    target.closest('a')
                  ) {
                    return;
                  }
                  router.push(`/admin/reviews/${row.original.id}`);
                }}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className='h-24 text-center'>
                No results.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
