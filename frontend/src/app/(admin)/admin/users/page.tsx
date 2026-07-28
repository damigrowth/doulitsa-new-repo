import { Suspense } from 'react';
import { SiteHeader } from '@/components/admin/site-header';
import { AdminUsersFilters } from '@/components/admin/admin-users-filters';
import { AdminUsersTableSkeleton } from '@/components/admin/admin-users-table-skeleton';
import { AdminUsersTableSection } from '@/components/admin/admin-users-table-section';
import { Button } from '@/components/ui/button';
import { RefreshCw, UserPlus } from 'lucide-react';
import { NextLink } from '@/components';

export const dynamic = 'force-dynamic';

interface UsersPageProps {
  searchParams: Promise<{
    page?: string;
    limit?: string;
    search?: string;
    role?: string;
    status?: string;
    sortBy?: string;
    sortOrder?: string;
  }>;
}

export default async function UsersPage({ searchParams }: UsersPageProps) {
  // Await searchParams
  const params = await searchParams;

  return (
    <>
      <SiteHeader
        title='Users'
        actions={
          <>
            <Button variant='outline' size='md'>
              <RefreshCw className='h-4 w-4' />
              Refresh
            </Button>
            <Button variant='default' size='md' asChild>
              <NextLink href='/admin/users/create'>
                <UserPlus className='h-4 w-4' />
                Create User
              </NextLink>
            </Button>
          </>
        }
      />
      <div className='flex flex-col gap-4 pb-6 pt-4 md:gap-6'>
        <div className='px-4 lg:px-6'>
          <div className='space-y-6'>
            {/* Filters */}
            <AdminUsersFilters />

            {/* Users Table */}
            <Suspense
              key={JSON.stringify(params)}
              fallback={<AdminUsersTableSkeleton />}
            >
              <AdminUsersTableSection searchParams={params} />
            </Suspense>
          </div>
        </div>
      </div>
    </>
  );
}
