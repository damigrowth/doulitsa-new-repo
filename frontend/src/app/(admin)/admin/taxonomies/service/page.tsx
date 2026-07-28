import { Suspense } from 'react';
import { SiteHeader } from '@/components/admin/site-header';
import { AdminServiceTaxonomiesFilters } from '@/components/admin/admin-service-taxonomies-filters';
import { AdminServiceTaxonomiesTableSection } from '@/components/admin/admin-service-taxonomies-table-section';
import { AdminServiceTaxonomiesTableSkeleton } from '@/components/admin/admin-service-taxonomies-table-skeleton';
import { CreateServiceTaxonomyDialog } from '@/components/admin/create-service-taxonomy-dialog';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { getServiceTaxonomies } from '@/lib/taxonomies';

export const dynamic = 'force-dynamic';

interface ServiceTaxonomiesPageProps {
  searchParams: Promise<{
    page?: string;
    limit?: string;
    search?: string;
    level?: string;
    featured?: string;
    sortBy?: string;
    sortOrder?: string;
  }>;
}

export default async function ServiceTaxonomiesPage({
  searchParams,
}: ServiceTaxonomiesPageProps) {
  const params = await searchParams;

  // Prepare taxonomy data server-side to prevent client-side bundle bloat
  const serviceTaxonomies = getServiceTaxonomies();

  return (
    <>
      <SiteHeader
        title='Service Taxonomies'
        actions={
          <>
            <Button variant='outline' size='md'>
              <RefreshCw className='h-4 w-4' />
              Refresh
            </Button>
            <CreateServiceTaxonomyDialog />
          </>
        }
      />
      <div className='flex flex-col gap-4 pb-6 pt-4 md:gap-6'>
        <div className='px-4 lg:px-6'>
          <div className='space-y-6'>
            {/* Filters */}
            <AdminServiceTaxonomiesFilters />

            {/* Service Taxonomies Table */}
            <Suspense
              key={JSON.stringify(params)}
              fallback={<AdminServiceTaxonomiesTableSkeleton />}
            >
              <AdminServiceTaxonomiesTableSection
                searchParams={params}
                serviceTaxonomies={serviceTaxonomies}
              />
            </Suspense>
          </div>
        </div>
      </div>
    </>
  );
}
