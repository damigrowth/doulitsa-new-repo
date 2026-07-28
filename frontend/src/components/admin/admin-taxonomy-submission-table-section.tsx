import { AdminTaxonomySubmissionDataTable } from './admin-taxonomy-submission-data-table';
import AdminTablePagination from './admin-table-pagination';
import { listTaxonomySubmissions } from '@/actions/admin/taxonomy-submission';

interface TableSectionProps {
  searchParams: {
    page?: string;
    limit?: string;
    search?: string;
    status?: string;
    type?: string;
    sortBy?: string;
    sortOrder?: string;
  };
}

export async function AdminTaxonomySubmissionTableSection({
  searchParams,
}: TableSectionProps) {
  // Parse search params for filters
  const filters: any = {
    limit: parseInt(searchParams.limit || '12'),
    offset:
      (parseInt(searchParams.page || '1') - 1) *
      parseInt(searchParams.limit || '12'),
    sortBy: searchParams.sortBy || 'createdAt',
    sortDirection: searchParams.sortOrder || 'desc',
  };

  if (searchParams.search) {
    filters.searchQuery = searchParams.search;
  }

  if (searchParams.status && searchParams.status !== 'all') {
    filters.status = searchParams.status;
  }

  if (searchParams.type && searchParams.type !== 'all') {
    filters.type = searchParams.type;
  }

  // Fetch taxonomy submissions data
  const result = await listTaxonomySubmissions(filters);

  // Handle errors
  if (!result.success) {
    return (
      <div className='text-center py-8'>
        <p className='text-red-600'>{result.error}</p>
        <p className='text-gray-500 mt-2'>
          Please refresh the page or try again later.
        </p>
      </div>
    );
  }

  const items =
    (result.data as any)?.submissions ?? (result.data as any)?.items ?? [];
  const total = (result.data as any)?.total ?? items.length;

  const currentPage = parseInt(searchParams.page || '1');
  const limit = parseInt(searchParams.limit || '12');
  const totalPages = Math.ceil(total / limit);

  return (
    <>
      <AdminTaxonomySubmissionDataTable data={items} />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className='mt-6'>
          <AdminTablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            currentLimit={limit}
            basePath='/admin/taxonomies/submissions'
          />
        </div>
      )}
    </>
  );
}
