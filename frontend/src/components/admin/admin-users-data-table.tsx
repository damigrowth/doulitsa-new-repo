'use client';

import { Badge } from '@/components/ui/badge';
import { formatDate, formatTime } from '@/lib/utils/date';
import { AdminDataTable, ColumnDef } from './admin-data-table';
import type { AdminUserRow } from '@/lib/types/admin';
import UserBadges from '@/components/shared/user-badges';
import { NextLink } from '@/components';

interface AdminUsersDataTableProps {
  data: AdminUserRow[];
  loading?: boolean;
  basePath?: string;
}

export function AdminUsersDataTable({
  data,
  loading = false,
  basePath = '/admin/users',
}: AdminUsersDataTableProps) {
  // Helper functions
  const getTypeBadgeVariant = (type: string) => {
    return 'outline' as const;
  };

  const getRoleBadgeVariant = (role: string) => {
    return 'outline' as const;
  };

  // Column definitions
  const columns: ColumnDef<AdminUserRow>[] = [
    {
      key: 'name',
      header: 'User',
      sortable: true,
      render: (user) => (
        <div className='space-y-1'>
          <NextLink
            href={`${basePath}/${user.id}`}
            className='font-medium hover:text-primary transition-colors hover:underline'
          >
            {user.email}
          </NextLink>
          {user.type === 'pro' && user.displayName && (
            <div className='text-xs text-muted-foreground'>
              @{user.displayName}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      sortable: true,
      render: (user) => (
        <Badge variant={getTypeBadgeVariant(user.type)}>
          {user.type.charAt(0).toUpperCase() + user.type.slice(1)}
        </Badge>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      sortable: true,
      render: (user) => {
        const roleLabel =
          user.role === 'freelancer'
            ? 'Professional'
            : user.role.charAt(0).toUpperCase() + user.role.slice(1);
        return (
          <Badge variant={getRoleBadgeVariant(user.role)}>{roleLabel}</Badge>
        );
      },
    },
    {
      key: 'step',
      header: 'Step',
      render: (user) => <Badge variant='outline'>{user.step}</Badge>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (user) => (
        <UserBadges
          verified={user.emailVerified}
          banned={user.banned}
          blocked={user.blocked}
        />
      ),
    },
    {
      key: 'createdAt',
      header: 'Created',
      sortable: true,
      render: (user) => (
        <div className='space-y-1'>
          <div className='text-sm'>{formatDate(user.createdAt)}</div>
          <div className='text-xs text-muted-foreground'>
            {formatTime(user.createdAt)}
          </div>
        </div>
      ),
    },
    {
      key: 'updatedAt',
      header: 'Updated',
      sortable: true,
      render: (user) => (
        <div className='space-y-1'>
          <div className='text-sm'>{formatDate(user.updatedAt)}</div>
          <div className='text-xs text-muted-foreground'>
            {formatTime(user.updatedAt)}
          </div>
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
      editPath={(user) => `${basePath}/${user.id}`}
      emptyMessage='No users found matching your criteria.'
    />
  );
}
