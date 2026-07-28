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
import { ArrowUpDown, Edit, Copy, Check } from 'lucide-react';
import { formatDate, formatTime } from '@/lib/utils/date';
import { cn } from '@/lib/utils';

import type { AdminVerificationRow } from '@/lib/types/admin';

interface AdminVerificationsDataTableProps {
  data: AdminVerificationRow[];
  loading?: boolean;
  onView?: (verification: AdminVerificationRow) => void;
  onApprove?: (verification: AdminVerificationRow) => void;
  onReject?: (verification: AdminVerificationRow) => void;
  onDelete?: (verification: AdminVerificationRow) => void;
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

export function AdminVerificationsDataTable({
  data,
  loading = false,
  onView,
  onApprove,
  onReject,
  onDelete,
}: AdminVerificationsDataTableProps) {
  const router = useRouter();
  const [sorting, setSorting] = React.useState<SortingState>([]);

  // Helper function for status badge
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return 'default' as const; // Green
      case 'REJECTED':
        return 'destructive' as const; // Red
      case 'PENDING':
        return 'outline' as const; // Orange (will be styled)
      default:
        return 'outline' as const;
    }
  };

  // Helper function for status badge className
  const getStatusBadgeClassName = (status: string) => {
    if (status === 'PENDING') {
      return 'border-yellow-500 text-yellow-600 bg-yellow-50';
    }
    return '';
  };

  // Column definitions
  const columns: ColumnDef<AdminVerificationRow>[] = [
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
      accessorKey: 'afm',
      header: 'AFM',
      cell: ({ row }) => {
        const afm = row.original.afm;
        return afm ? (
          <CopyableText text={afm} />
        ) : (
          <span className='text-muted-foreground text-sm'>—</span>
        );
      },
    },
    {
      accessorKey: 'name',
      header: 'Business Name',
      cell: ({ row }) => {
        const name = row.original.name;
        return (
          <div className='max-w-[200px] truncate'>
            {name || <span className='text-muted-foreground text-sm'>—</span>}
          </div>
        );
      },
    },
    {
      id: 'profile',
      header: 'Profile',
      cell: ({ row }) => {
        const verification = row.original;
        const profile = verification.profile;
        return (
          <NextLink
            href={`/admin/profiles/${profile.id}`}
            className='hover:underline'
          >
            <div className='flex items-center gap-2'>
              <UserAvatar
                displayName={profile.displayName ?? undefined}
                size='sm'
                className='h-8 w-8'
                showBorder={false}
                showShadow={false}
              />
              <div className='min-w-0'>
                <p className='font-medium truncate text-sm'>
                  {profile.displayName}
                </p>
              </div>
            </div>
          </NextLink>
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
        const verification = row.original;

        return (
          <Button
            variant='ghost'
            size='icon'
            onClick={() =>
              router.push(`/admin/verifications/${verification.id}`)
            }
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
        <div className='text-muted-foreground'>Loading verifications...</div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className='flex items-center justify-center p-8'>
        <div className='text-center'>
          <p className='text-muted-foreground'>No verifications found</p>
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
                  router.push(`/admin/verifications/${row.original.id}`);
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
