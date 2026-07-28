import { Suspense } from 'react';
import { SiteHeader } from '@/components/admin/site-header';
import { AdminServicesFilters } from '@/components/admin/admin-services-filters';
import { AdminServicesTableSkeleton } from '@/components/admin/admin-services-table-skeleton';
import { AdminServicesTableSection } from '@/components/admin/admin-services-table-section';
import { Button } from '@/components/ui/button';
import { RefreshCw, Plus } from 'lucide-react';
import { NextLink } from '@/components';

export const dynamic = 'force-dynamic';

interface ServicesPageProps {
  searchParams: Promise<{
    page?: string;
    limit?: string;
    status?: string;
    search?: string;
    featured?: string;
    type?: string;
    pricing?: string;
    subscriptionType?: string;
    sortBy?: string;
    sortOrder?: string;
  }>;
}

export default async function ServicesPage({
  searchParams,
}: ServicesPageProps) {
  // Await searchParams
  const params = await searchParams;

  return (
    <>
      <SiteHeader
        title='Services'
        actions={
          <>
            <Button variant='outline' size='md'>
              <RefreshCw className='h-4 w-4' />
              Refresh
            </Button>
            <Button variant='default' size='md' asChild>
              <NextLink href='/admin/services/create'>
                <Plus className='h-4 w-4' />
                Create Service
              </NextLink>
            </Button>
          </>
        }
      />
      <div className='flex flex-col gap-4 pb-6 pt-4 md:gap-6'>
        <div className='px-4 lg:px-6'>
          <div className='space-y-6'>
            {/* Filters */}
            <AdminServicesFilters />

            {/* Services Table */}
            <Suspense
              key={JSON.stringify(params)}
              fallback={<AdminServicesTableSkeleton />}
            >
              <AdminServicesTableSection searchParams={params} />
            </Suspense>
          </div>
        </div>
      </div>
    </>
  );
}
