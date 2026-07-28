'use client';

import React, { useState } from 'react';
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
import { ArrowUpDown, Copy, Check, Eye } from 'lucide-react';
import { formatDate, formatTime } from '@/lib/utils/date';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import {
  SubscriptionStatus,
  BillingInterval,
} from '@/lib/prisma-types';
import type { AdminSubscriptionRow } from '@/lib/types/admin';

// Copyable text component with hover state
function CopyableText({
  text,
  displayText,
  className,
}: {
  text: string;
  displayText?: string;
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
      className={`group flex items-center gap-2 cursor-pointer hover:text-primary transition-colors ${className}`}
      onClick={handleCopy}
    >
      <span>{displayText || text}</span>
      {copied ? (
        <Check className='h-3 w-3 text-green-600' />
      ) : (
        <Copy className='h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity' />
      )}
    </div>
  );
}

interface AdminSubscriptionsDataTableProps {
  data: AdminSubscriptionRow[];
  loading?: boolean;
}

export function AdminSubscriptionsDataTable({
  data,
  loading = false,
}: AdminSubscriptionsDataTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const router = useRouter();

  // Helper function for status badge
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case SubscriptionStatus.active:
        return 'default' as const;
      case SubscriptionStatus.canceled:
        return 'destructive' as const;
      default:
        return 'outline' as const;
    }
  };

  // Helper function for status badge className
  const getStatusBadgeClassName = (status: string) => {
    switch (status) {
      case SubscriptionStatus.past_due:
        return 'border-yellow-500 text-yellow-600 bg-yellow-50';
      case SubscriptionStatus.trialing:
        return 'border-blue-500 text-blue-600 bg-blue-50';
      default:
        return '';
    }
  };

  // Helper function for status label
  const getStatusLabel = (status: string) => {
    switch (status) {
      case SubscriptionStatus.active:
        return 'Ενεργή';
      case SubscriptionStatus.canceled:
        return 'Έληξε';
      case SubscriptionStatus.past_due:
        return 'Εκπρόθεσμη';
      case SubscriptionStatus.incomplete:
        return 'Ημιτελής';
      case SubscriptionStatus.trialing:
        return 'Δοκιμαστική';
      case SubscriptionStatus.unpaid:
        return 'Απλήρωτη';
      default:
        return status;
    }
  };

  // Helper function for billing interval label
  const getBillingLabel = (interval: string | null) => {
    switch (interval) {
      case BillingInterval.month:
        return 'Μηνιαία';
      case BillingInterval.year:
        return 'Ετήσια';
      default:
        return '—';
    }
  };

  // Column definitions
  const columns: ColumnDef<AdminSubscriptionRow>[] = [
    {
      accessorKey: 'id',
      header: 'ID',
      cell: ({ row }) => (
        <CopyableText
          text={row.original.id}
          displayText={`${row.original.id.slice(0, 8)}...`}
          className='text-xs text-muted-foreground font-mono'
        />
      ),
    },
    {
      id: 'profile',
      header: 'Προφίλ',
      cell: ({ row }) => {
        const subscription = row.original;
        const profile = subscription.profile;
        return (
          <NextLink
            href={`/admin/profiles/${subscription.pid}`}
            className='hover:underline'
          >
            <div className='flex items-center gap-2'>
              <UserAvatar
                displayName={profile?.displayName || 'Unknown'}
                image={profile?.image ?? undefined}
                size='sm'
                className='h-8 w-8'
                showBorder={false}
                showShadow={false}
              />
              <div className='min-w-0'>
                <p className='font-medium truncate text-sm'>
                  {profile?.displayName || 'Unknown'}
                </p>
                <p className='text-xs text-muted-foreground truncate'>
                  {profile?.user?.email || profile?.email || '—'}
                </p>
              </div>
            </div>
          </NextLink>
        );
      },
    },
    {
      accessorKey: 'status',
      header: ({ column }) => {
        return (
          <Button
            variant='ghost'
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className='h-auto p-0'
          >
            Κατάσταση
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
            {getStatusLabel(status)}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'billingInterval',
      header: 'Πλάνο',
      cell: ({ row }) => {
        const interval = row.original.billingInterval;
        if (!interval) {
          return <span className='text-muted-foreground text-sm'>—</span>;
        }
        return (
          <Badge variant='outline'>{getBillingLabel(interval)}</Badge>
        );
      },
    },
    {
      accessorKey: 'amount',
      header: 'Ποσό',
      cell: ({ row }) => {
        const amount = row.original.amount;
        if (!amount) {
          return <span className='text-muted-foreground text-sm'>—</span>;
        }
        const euros = amount / 100;
        const formatted = Number.isInteger(euros) ? euros.toString() : euros.toFixed(2);
        return <span className='font-medium'>{formatted}€</span>;
      },
    },
    {
      accessorKey: 'lastPaymentAt',
      header: ({ column }) => {
        return (
          <Button
            variant='ghost'
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className='h-auto p-0'
          >
            Τελ. Πληρωμή
            <ArrowUpDown className='ml-2 h-4 w-4' />
          </Button>
        );
      },
      cell: ({ row }) => {
        const date = row.original.lastPaymentAt;
        if (!date) {
          return <span className='text-muted-foreground text-sm'>—</span>;
        }
        return (
          <div className='text-sm text-muted-foreground'>
            <div>{formatDate(date)}</div>
            <div className='text-xs'>{formatTime(date)}</div>
          </div>
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
            Δημιουργία
            <ArrowUpDown className='ml-2 h-4 w-4' />
          </Button>
        );
      },
      cell: ({ row }) => {
        const date = row.original.createdAt;
        return (
          <div className='text-sm text-muted-foreground'>
            <div>{formatDate(date)}</div>
            <div className='text-xs'>{formatTime(date)}</div>
          </div>
        );
      },
    },
    {
      accessorKey: 'currentPeriodEnd',
      header: 'Λήγει',
      cell: ({ row }) => {
        const date = row.original.currentPeriodEnd;

        if (!date) {
          return <span className='text-muted-foreground text-sm'>—</span>;
        }

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
      header: '',
      cell: ({ row }) => {
        return (
          <Button
            variant='ghost'
            size='sm'
            className='h-8 w-8 p-0'
            onClick={() => router.push(`/admin/subscriptions/${row.original.id}`)}
          >
            <Eye className='h-4 w-4' />
            <span className='sr-only'>Προβολή</span>
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
        <div className='text-muted-foreground'>Φόρτωση συνδρομών...</div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className='flex items-center justify-center p-8'>
        <div className='text-center'>
          <p className='text-muted-foreground'>Δεν βρέθηκαν συνδρομές</p>
          <p className='text-sm text-muted-foreground mt-1'>
            Δοκιμάστε να αλλάξετε τα φίλτρα
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className='rounded-md border'>
      <Table>
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
              <TableRow key={row.id}>
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
                Δεν υπάρχουν αποτελέσματα.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
