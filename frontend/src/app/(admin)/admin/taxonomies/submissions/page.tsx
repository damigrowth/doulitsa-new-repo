import { Suspense } from 'react';
import { SiteHeader } from '@/components/admin/site-header';
import { AdminTaxonomySubmissionStats } from '@/components/admin/admin-taxonomy-submission-stats';
import { AdminTaxonomySubmissionFilters } from '@/components/admin/admin-taxonomy-submission-filters';
import { AdminTaxonomySubmissionTableSection } from '@/components/admin/admin-taxonomy-submission-table-section';
import { AdminTaxonomySubmissionTableSkeleton } from '@/components/admin/admin-taxonomy-submission-table-skeleton';

export const dynamic = 'force-dynamic';

interface SubmissionsPageProps {
  searchParams: Promise<{
    page?: string;
    limit?: string;
    search?: string;
    status?: string;
    type?: string;
  }>;
}

export default async function AdminTaxonomySubmissionsPage({
  searchParams,
}: SubmissionsPageProps) {
  const params = await searchParams;

  return (
    <>
      <SiteHeader title='Taxonomy Submissions' />
      <div className='flex flex-col gap-4 pb-6 pt-4 md:gap-6'>
        <div className='px-4 lg:px-6'>
          <div className='space-y-6'>
            {/* Stats Cards */}
            <div className='grid gap-4 md:grid-cols-4'>
              <AdminTaxonomySubmissionStats />
            </div>

            {/* Filters */}
            <AdminTaxonomySubmissionFilters />

            {/* Data Table */}
            <Suspense
              key={JSON.stringify(params)}
              fallback={<AdminTaxonomySubmissionTableSkeleton />}
            >
              <AdminTaxonomySubmissionTableSection searchParams={params} />
            </Suspense>
          </div>
        </div>
      </div>
    </>
  );
}
