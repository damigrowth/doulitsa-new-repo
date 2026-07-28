import { AdminServicesDataTable } from './admin-services-data-table';
import AdminTablePagination from './admin-table-pagination';
import { listServices } from '@/actions/admin/services';

interface AdminServicesTableSectionProps {
  searchParams: {
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
  };
}

export async function AdminServicesTableSection({
  searchParams,
}: AdminServicesTableSectionProps) {
  // Parse search params for filters
  const filters: any = {
    limit: parseInt(searchParams.limit || '12'),
    offset:
      (parseInt(searchParams.page || '1') - 1) *
      parseInt(searchParams.limit || '12'),
    sortBy: searchParams.sortBy || 'createdAt',
    sortDirection: searchParams.sortOrder || 'desc',
  };

  if (searchParams.search) filters.searchQuery = searchParams.search;
  if (searchParams.status && searchParams.status !== 'all')
    filters.status = searchParams.status;
  if (searchParams.featured && searchParams.featured !== 'all')
    filters.featured = searchParams.featured;
  if (searchParams.type && searchParams.type !== 'all')
    filters.type = searchParams.type;
  if (searchParams.pricing && searchParams.pricing !== 'all')
    filters.pricing = searchParams.pricing;
  if (searchParams.subscriptionType && searchParams.subscriptionType !== 'all')
    filters.subscriptionType = searchParams.subscriptionType;

  // Fetch data server-side
  const servicesResult = await listServices(filters);

  // Handle errors
  if (!servicesResult.success) {
    return (
      <div className='text-center py-8'>
        <p className='text-red-600'>{servicesResult.error}</p>
        <p className='text-gray-500 mt-2'>
          Please refresh the page or try again later.
        </p>
      </div>
    );
  }

  const services = servicesResult.data?.services || [];
  const total = servicesResult.data?.total || 0;

  const currentPage = parseInt(searchParams.page || '1');
  const limit = parseInt(searchParams.limit || '12');
  const totalPages = Math.ceil(total / limit);

  return (
    <>
      <AdminServicesDataTable data={services} />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className='mt-6'>
          <AdminTablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            currentLimit={limit}
            basePath='/admin/services'
          />
        </div>
      )}
    </>
  );
}
