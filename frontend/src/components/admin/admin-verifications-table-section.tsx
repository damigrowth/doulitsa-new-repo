import { AdminVerificationsDataTable } from './admin-verifications-data-table';
import AdminTablePagination from './admin-table-pagination';
import { listVerifications } from '@/actions/admin/verifications';

interface VerificationsTableSectionProps {
  searchParams: {
    page?: string;
    limit?: string;
    search?: string;
    status?: string;
    sortBy?: string;
    sortOrder?: string;
  };
}

export async function AdminVerificationsTableSection({
  searchParams,
}: VerificationsTableSectionProps) {
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

  // Fetch verifications data
  const verificationsResult = await listVerifications(filters);

  // Handle errors
  if (!verificationsResult.success) {
    return (
      <div className='text-center py-8'>
        <p className='text-red-600'>{verificationsResult.error}</p>
        <p className='text-gray-500 mt-2'>
          Please refresh the page or try again later.
        </p>
      </div>
    );
  }

  const verifications = verificationsResult.data?.verifications || [];
  const total = verificationsResult.data?.total || 0;

  const currentPage = parseInt(searchParams.page || '1');
  const limit = parseInt(searchParams.limit || '12');
  const totalPages = Math.ceil(total / limit);

  return (
    <>
      <AdminVerificationsDataTable data={verifications} />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className='mt-6'>
          <AdminTablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            currentLimit={limit}
            basePath='/admin/verifications'
          />
        </div>
      )}
    </>
  );
}
