'use client';

import React, { useState, useTransition } from 'react';
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
import { ArrowUpDown, Check, X, Loader2 } from 'lucide-react';
import { formatDate, formatTime } from '@/lib/utils/date';
import {
  approveTaxonomySubmission,
  rejectTaxonomySubmission,
} from '@/actions/admin/taxonomy-submission';
import { toast } from 'sonner';

interface SubmissionItem {
  id: string;
  label: string;
  type: string;
  status: string;
  category: string | null;
  categoryLabel: string | null;
  submittedBy: string;
  submitterProfile: {
    id: string;
    displayName: string;
    image: string | null;
  } | null;
  reviewedBy: string | null;
  reviewedAt: Date | null;
  assignedId: string | null;
  rejectReason: string | null;
  createdAt: Date;
}

interface DataTableProps {
  data: SubmissionItem[];
  loading?: boolean;
}

export function AdminTaxonomySubmissionDataTable({
  data,
  loading = false,
}: DataTableProps) {
  const router = useRouter();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [isPending, startTransition] = useTransition();
  const [processingId, setProcessingId] = useState<string | null>(null);

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'approved':
        return 'default' as const;
      case 'rejected':
        return 'destructive' as const;
      case 'pending':
        return 'outline' as const;
      default:
        return 'outline' as const;
    }
  };

  const getStatusBadgeClassName = (status: string) => {
    if (status === 'pending') {
      return 'border-yellow-500 text-yellow-600 bg-yellow-50';
    }
    return '';
  };

  const handleApprove = async (id: string) => {
    setProcessingId(id);
    startTransition(async () => {
      const result = await approveTaxonomySubmission(id);
      if (result.success) {
        // Approval writes the tag/skill straight to the DB → live immediately,
        // no Git step.
        toast.success(`Approved (ID: ${result.assignedId}) — live now.`);
        router.refresh();
      } else {
        toast.error(result.error || 'Error approving');
      }
      setProcessingId(null);
    });
  };

  const handleReject = async (id: string) => {
    setProcessingId(id);
    startTransition(async () => {
      const result = await rejectTaxonomySubmission(id);
      if (result.success) {
        toast.success('Rejected');
        router.refresh();
      } else {
        toast.error(result.error || 'Error rejecting');
      }
      setProcessingId(null);
    });
  };

  const columns: ColumnDef<SubmissionItem>[] = [
    {
      accessorKey: 'status',
      header: ({ column }) => (
        <Button
          variant='ghost'
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className='h-auto p-0'
        >
          Status
          <ArrowUpDown className='ml-2 h-4 w-4' />
        </Button>
      ),
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
      accessorKey: 'label',
      header: ({ column }) => (
        <Button
          variant='ghost'
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className='h-auto p-0'
        >
          Label
          <ArrowUpDown className='ml-2 h-4 w-4' />
        </Button>
      ),
      cell: ({ row }) => (
        <span className='font-medium'>{row.original.label}</span>
      ),
    },
    {
      accessorKey: 'type',
      header: 'Type',
      cell: ({ row }) => (
        <Badge variant='outline' className='text-xs'>
          {row.original.type === 'skill' ? 'Skill' : 'Tag'}
        </Badge>
      ),
    },
    {
      accessorKey: 'categoryLabel',
      header: 'Category',
      cell: ({ row }) => (
        <span className='text-sm text-muted-foreground'>
          {row.original.categoryLabel || '-'}
        </span>
      ),
    },
    {
      id: 'submitter',
      header: 'By',
      cell: ({ row }) => {
        const profile = row.original.submitterProfile;
        if (!profile) {
          return <span className='text-sm text-muted-foreground'>-</span>;
        }
        return (
          <NextLink
            href={`/admin/profiles/${profile.id}`}
            className='hover:underline'
          >
            <div className='flex items-center gap-2'>
              <UserAvatar
                displayName={profile.displayName}
                image={profile.image}
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
      header: ({ column }) => (
        <Button
          variant='ghost'
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className='h-auto p-0'
        >
          Date
          <ArrowUpDown className='ml-2 h-4 w-4' />
        </Button>
      ),
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
        const item = row.original;
        const isProcessing = processingId === item.id;

        if (item.status !== 'pending') {
          return (
            <div className='text-right'>
              <span className='text-xs text-muted-foreground'>
                {item.assignedId ? `ID: ${item.assignedId}` : item.rejectReason || '-'}
              </span>
            </div>
          );
        }

        return (
          <div className='flex items-center justify-end gap-1'>
            <Button
              variant='ghost'
              size='icon'
              onClick={() => handleApprove(item.id)}
              disabled={isPending || isProcessing}
              className='text-green-600 hover:text-green-700 hover:bg-green-50'
            >
              {isProcessing ? (
                <Loader2 className='h-4 w-4 animate-spin' />
              ) : (
                <Check className='h-4 w-4' />
              )}
            </Button>
            <Button
              variant='ghost'
              size='icon'
              onClick={() => handleReject(item.id)}
              disabled={isPending || isProcessing}
              className='text-red-600 hover:text-red-700 hover:bg-red-50'
            >
              <X className='h-4 w-4' />
            </Button>
          </div>
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
    state: { sorting },
  });

  if (loading) {
    return (
      <div className='flex items-center justify-center p-8'>
        <div className='text-muted-foreground'>Loading submissions...</div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className='flex items-center justify-center p-8'>
        <div className='text-center'>
          <p className='text-muted-foreground'>No submissions found</p>
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
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className='h-24 text-center'
                >
                  No taxonomy submissions found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
    </div>
  );
}
