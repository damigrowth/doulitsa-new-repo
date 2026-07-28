import { AdminProfilesDataTable } from './admin-profiles-data-table';
import AdminTablePagination from './admin-table-pagination';
import { listProfiles } from '@/actions/admin/profiles';

interface ProfilesTableSectionProps {
  searchParams: {
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
  };
}

export async function AdminProfilesTableSection({
  searchParams,
}: ProfilesTableSectionProps) {
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

  if (searchParams.type && searchParams.type !== 'all') {
    filters.type = searchParams.type;
  }

  if (searchParams.published && searchParams.published !== 'all') {
    filters.published = searchParams.published;
  }

  if (searchParams.verified && searchParams.verified !== 'all') {
    filters.verified = searchParams.verified;
  }

  if (searchParams.featured && searchParams.featured !== 'all') {
    filters.featured = searchParams.featured;
  }

  if (searchParams.status && searchParams.status !== 'all') {
    filters.status = searchParams.status;
  }

  if (searchParams.category) {
    filters.category = searchParams.category;
  }

  // Fetch profiles data
  const profilesResult = await listProfiles(filters);

  // Handle errors
  if (!profilesResult.success) {
    return (
      <div className='text-center py-8'>
        <p className='text-red-600'>{profilesResult.error}</p>
        <p className='text-gray-500 mt-2'>
          Please refresh the page or try again later.
        </p>
      </div>
    );
  }

  const profiles = profilesResult.data?.profiles || [];
  const total = profilesResult.data?.total || 0;

  const currentPage = parseInt(searchParams.page || '1');
  const limit = parseInt(searchParams.limit || '12');
  const totalPages = Math.ceil(total / limit);

  return (
    <>
      <AdminProfilesDataTable data={profiles} />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className='mt-6'>
          <AdminTablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            currentLimit={limit}
            basePath='/admin/profiles'
          />
        </div>
      )}
    </>
  );
}
