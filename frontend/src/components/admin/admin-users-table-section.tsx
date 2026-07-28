import { AdminUsersDataTable } from './admin-users-data-table';
import { AdminUsersFilters } from './admin-users-filters';
import AdminTablePagination from './admin-table-pagination';
import { listUsers } from '@/actions/admin/users';

interface UsersTableSectionProps {
  searchParams: {
    page?: string;
    limit?: string;
    search?: string;
    type?: string;
    provider?: string;
    step?: string;
    status?: string;
    role?: string;
    sortBy?: string;
    sortOrder?: string;
  };
}

export async function AdminUsersTableSection({
  searchParams,
}: UsersTableSectionProps) {
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
    filters.searchField = 'email';
    filters.searchOperator = 'contains';
    filters.searchValue = searchParams.search;
  }

  if (searchParams.type && searchParams.type !== 'all') {
    filters.type = searchParams.type;
  }

  if (searchParams.provider && searchParams.provider !== 'all') {
    filters.provider = searchParams.provider;
  }

  if (searchParams.step && searchParams.step !== 'all') {
    filters.step = searchParams.step;
  }

  if (searchParams.status && searchParams.status !== 'all') {
    filters.status = searchParams.status;
  }

  if (searchParams.role && searchParams.role !== 'all') {
    filters.role = searchParams.role;
  }

  // Fetch users data
  const usersResult = await listUsers(filters);

  // Handle errors
  if (!usersResult.success) {
    return (
      <div className='text-center py-8'>
        <p className='text-red-600'>{usersResult.error}</p>
        <p className='text-gray-500 mt-2'>
          Please refresh the page or try again later.
        </p>
      </div>
    );
  }

  const users = usersResult.data?.users || [];
  const total = usersResult.data?.total || 0;

  const currentPage = parseInt(searchParams.page || '1');
  const limit = parseInt(searchParams.limit || '12');
  const totalPages = Math.ceil(total / limit);

  return (
    <div className='space-y-4'>
      <AdminUsersDataTable data={users} />
      <AdminTablePagination
        currentPage={currentPage}
        totalPages={totalPages}
        currentLimit={limit}
        basePath='/admin/users'
      />
    </div>
  );
}
