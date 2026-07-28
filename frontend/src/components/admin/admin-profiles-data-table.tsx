'use client';

import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import ProfileBadges from '@/components/shared/profile-badges';
import { Copy, Check } from 'lucide-react';
import TaxonomiesDisplay from '@/components/shared/taxonomies-display';
import { formatDate, formatTime } from '@/lib/utils/date';
import { AdminDataTable, ColumnDef } from './admin-data-table';
import type { AdminProfileRow } from '@/lib/types/admin';
import UserAvatar from '../shared/user-avatar';
import { NextLink } from '@/components';

// Copyable text component with hover state
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
      className={`group flex items-center gap-2 cursor-pointer hover:text-primary transition-colors ${className}`}
      onClick={handleCopy}
    >
      <span>{text}</span>
      {copied ? (
        <Check className='h-3 w-3 text-green-600' />
      ) : (
        <Copy className='h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity' />
      )}
    </div>
  );
}

interface AdminProfilesDataTableProps {
  data: AdminProfileRow[];
  loading?: boolean;
  basePath?: string;
}

export function AdminProfilesDataTable({
  data,
  loading = false,
  basePath = '/admin/profiles',
}: AdminProfilesDataTableProps) {
  // Helper functions
  const getTypeBadgeVariant = (type: string | null) => {
    return 'outline' as const;
  };

  // Column definitions
  const columns: ColumnDef<AdminProfileRow>[] = [
    {
      key: 'displayName',
      header: 'Προφίλ',
      sortable: true,
      render: (profile) => {
        // `profile.user` isn't always expanded by the admin endpoint — the
        // backend returns email/name at the top level when available, so
        // chain optional accesses to avoid a crash on the new shape.
        const displayName =
          profile.displayName || profile.user?.name || 'Unknown';
        const email = profile.email || profile.user?.email || '—';

        return (
          <div className='flex items-center gap-3'>
            <UserAvatar
              displayName={displayName}
              image={profile.image ?? undefined}
              size='sm'
              className='h-10 w-10'
              showBorder={false}
              showShadow={false}
            />
            <div className='space-y-1'>
              <NextLink
                href={`${basePath}/${profile.id}`}
                className='font-medium hover:text-primary transition-colors hover:underline'
              >
                {displayName}
              </NextLink>
              <CopyableText
                text={email}
                className='text-sm text-muted-foreground'
              />
              {profile.username && (
                <CopyableText
                  text={profile.username}
                  className='text-xs text-muted-foreground'
                />
              )}
            </div>
          </div>
        );
      },
    },
    {
      key: 'type',
      header: 'Τύπος',
      render: (profile) => {
        if (!profile.type)
          return <span className='text-muted-foreground text-sm'>-</span>;

        const roleLabel =
          profile.type === 'freelancer' ? 'Professional' : 'Company';

        return (
          <Badge variant={getTypeBadgeVariant(profile.type)}>{roleLabel}</Badge>
        );
      },
    },
    {
      key: 'category',
      header: 'Κατηγορία',
      render: (profile) => {
        if (!profile.taxonomyLabels) {
          return <span className='text-muted-foreground text-sm'>-</span>;
        }

        return (
          <TaxonomiesDisplay taxonomyLabels={profile.taxonomyLabels} compact />
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (profile) => (
        <ProfileBadges
          featured={profile.featured}
          verified={profile.verified}
          topLevel={profile.top}
        />
      ),
    },
    {
      key: 'services',
      header: 'Υπηρεσίες',
      sortable: true,
      render: (profile) => (
        <div className='text-sm font-medium'>{profile._count?.services ?? 0}</div>
      ),
    },
    {
      key: 'createdAt',
      header: 'Created',
      sortable: true,
      render: (profile) => (
        <div className='text-sm text-muted-foreground'>
          <div>{profile.createdAt ? formatDate(profile.createdAt) : '—'}</div>
          <div className='text-xs'>
            {profile.createdAt ? formatTime(profile.createdAt) : ''}
          </div>
        </div>
      ),
    },
    {
      key: 'updatedAt',
      header: 'Updated',
      sortable: true,
      render: (profile) => (
        <div className='text-sm text-muted-foreground'>
          <div>{profile.updatedAt ? formatDate(profile.updatedAt) : '—'}</div>
          <div className='text-xs'>
            {profile.updatedAt ? formatTime(profile.updatedAt) : ''}
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
      editPath={(profile) => `${basePath}/${profile.id}`}
      emptyMessage='No profiles found matching your criteria.'
    />
  );
}
