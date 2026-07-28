import { Suspense } from 'react';
import { SiteHeader } from '@/components/admin/site-header';
import { AdminReviewsFilters } from '@/components/admin/admin-reviews-filters';
import { AdminReviewsTableSkeleton } from '@/components/admin/admin-reviews-table-skeleton';
import { AdminReviewsStats } from '@/components/admin/admin-reviews-stats';
import { AdminReviewsTableSection } from '@/components/admin/admin-reviews-table-section';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface ReviewsPageProps {
  searchParams: Promise<{
    page?: string;
    limit?: string;
    search?: string;
    status?: string;
    rating?: string;
    type?: string;
    sortBy?: string;
    sortOrder?: string;
  }>;
}

export default async function AdminReviewsPage({
  searchParams,
}: ReviewsPageProps) {
  // Await searchParams
  const params = await searchParams;

  return (
    <>
      <SiteHeader
        title='Reviews'
        actions={
          <>
            <Button variant='outline' size='md'>
              <RefreshCw className='h-4 w-4' />
              Refresh
            </Button>
          </>
        }
      />
      <div className='flex flex-col gap-4 pb-6 pt-4 md:gap-6'>
        <div className='px-4 lg:px-6'>
          <div className='space-y-6'>
            {/* Stats Cards */}
            <div className='grid gap-4 md:grid-cols-4'>
              <AdminReviewsStats />
            </div>

            {/* Filters */}
            <AdminReviewsFilters />

            {/* Reviews Table */}
            <Suspense
              key={JSON.stringify(params)}
              fallback={<AdminReviewsTableSkeleton />}
            >
              <AdminReviewsTableSection searchParams={params} />
            </Suspense>
          </div>
        </div>
      </div>
    </>
  );
}
