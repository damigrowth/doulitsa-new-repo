import { Suspense } from 'react';
import { SiteHeader } from '@/components/admin/site-header';
import { AdminProfilesFilters } from '@/components/admin/admin-profiles-filters';
import { AdminProfilesTableSkeleton } from '@/components/admin/admin-profiles-table-skeleton';
import { AdminProfilesTableSection } from '@/components/admin/admin-profiles-table-section';
import { Button } from '@/components/ui/button';
import { RefreshCw, UserPlus } from 'lucide-react';
import { NextLink } from '@/components';

export const dynamic = 'force-dynamic';

interface ProfilesPageProps {
  searchParams: Promise<{
    page?: string;
    limit?: string;
    search?: string;
    type?: string;
    published?: string;
    verified?: string;
    featured?: string;
    status?: string;
    category?: string;
    sortBy?: string;
    sortOrder?: string;
  }>;
}

export default async function ProfilesPage({
  searchParams,
}: ProfilesPageProps) {
  // Await searchParams
  const params = await searchParams;

  return (
    <>
      <SiteHeader
        title='Profiles'
        actions={
          <>
            <Button variant='outline' size='md'>
              <RefreshCw className='h-4 w-4' />
              Refresh
            </Button>
            <Button variant='default' size='md' asChild>
              <NextLink href='/admin/profiles/create'>
                <UserPlus className='h-4 w-4' />
                Create Profile
              </NextLink>
            </Button>
          </>
        }
      />
      <div className='flex flex-col gap-4 pb-6 pt-4 md:gap-6'>
        <div className='px-4 lg:px-6'>
          <div className='space-y-6'>
            {/* Filters */}
            <AdminProfilesFilters />

            {/* Profiles Table */}
            <Suspense
              key={JSON.stringify(params)}
              fallback={<AdminProfilesTableSkeleton />}
            >
              <AdminProfilesTableSection searchParams={params} />
            </Suspense>
          </div>
        </div>
      </div>
    </>
  );
}
