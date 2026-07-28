import { Suspense } from 'react';
import { SiteHeader } from '@/components/admin/site-header';
import { AdminProTaxonomiesFilters } from '@/components/admin/admin-pro-taxonomies-filters';
import { AdminProTaxonomiesTableSkeleton } from '@/components/admin/admin-pro-taxonomies-table-skeleton';
import { AdminProTaxonomiesTableSection } from '@/components/admin/admin-pro-taxonomies-table-section';
import { Button } from '@/components/ui/button';
import { RefreshCw, Plus } from 'lucide-react';
import { NextLink } from '@/components';
import { getProTaxonomies } from '@/lib/taxonomies';

export const dynamic = 'force-dynamic';

interface ProTaxonomiesPageProps {
  searchParams: Promise<{
    page?: string;
    limit?: string;
    search?: string;
    level?: string;
    type?: string;
    sortBy?: string;
    sortOrder?: string;
  }>;
}

export default async function ProTaxonomiesPage({
  searchParams,
}: ProTaxonomiesPageProps) {
  const params = await searchParams;

  // Prepare taxonomy data server-side to prevent client-side bundle bloat
  const proTaxonomies = getProTaxonomies();

  return (
    <>
      <SiteHeader
        title='Pro Taxonomies'
        actions={
          <>
            <Button variant='outline' size='md'>
              <RefreshCw className='h-4 w-4' />
              Refresh
            </Button>
            <Button variant='default' size='md' asChild>
              <NextLink href='/admin/taxonomies/pro/create'>
                <Plus className='h-4 w-4' />
                Create Category
              </NextLink>
            </Button>
          </>
        }
      />
      <div className='flex flex-col gap-4 pb-6 pt-4 md:gap-6'>
        <div className='px-4 lg:px-6'>
          <div className='space-y-6'>
            {/* Filters */}
            <AdminProTaxonomiesFilters />

            {/* Pro Taxonomies Table */}
            <Suspense
              key={JSON.stringify(params)}
              fallback={<AdminProTaxonomiesTableSkeleton />}
            >
              <AdminProTaxonomiesTableSection
                searchParams={params}
                proTaxonomies={proTaxonomies}
              />
            </Suspense>
          </div>
        </div>
      </div>
    </>
  );
}
