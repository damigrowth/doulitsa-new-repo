import { AdminSubscriptionsDataTable } from './admin-subscriptions-data-table';
import AdminTablePagination from '../admin-table-pagination';
import { listSubscriptions } from '@/actions/admin/subscriptions';
import type { AdminListSubscriptionsInput } from '@/lib/validations/admin';

interface SubscriptionsTableSectionProps {
  searchParams: {
    page?: string;
    limit?: string;
    search?: string;
    status?: string;
    billingInterval?: string;
    sortBy?: string;
    sortOrder?: string;
  };
}

export async function AdminSubscriptionsTableSection({
  searchParams,
}: SubscriptionsTableSectionProps) {
  // Parse search params for filters (values validated by Zod in the server action)
  const filters: Partial<AdminListSubscriptionsInput> = {
    limit: parseInt(searchParams.limit || '12'),
    offset:
      (parseInt(searchParams.page || '1') - 1) *
      parseInt(searchParams.limit || '12'),
    sortBy:
      (searchParams.sortBy as AdminListSubscriptionsInput['sortBy']) ||
      'lastPaymentAt',
    sortDirection:
      (searchParams.sortOrder as AdminListSubscriptionsInput['sortDirection']) ||
      'desc',
  };

  if (searchParams.search) filters.searchQuery = searchParams.search;
  if (searchParams.status && searchParams.status !== 'all')
    filters.status =
      searchParams.status as AdminListSubscriptionsInput['status'];
  if (searchParams.billingInterval && searchParams.billingInterval !== 'all')
    filters.billingInterval =
      searchParams.billingInterval as AdminListSubscriptionsInput['billingInterval'];

  // Fetch data server-side
  const subscriptionsResult = await listSubscriptions(filters);

  // Handle errors
  if (!subscriptionsResult.success) {
    return (
      <div className='text-center py-8'>
        <p className='text-red-600'>{subscriptionsResult.error}</p>
        <p className='text-gray-500 mt-2'>
          Ανανεώστε τη σελίδα ή δοκιμάστε ξανά αργότερα.
        </p>
      </div>
    );
  }

  const subscriptions = subscriptionsResult.data?.subscriptions || [];
  const total = subscriptionsResult.data?.total || 0;

  const currentPage = parseInt(searchParams.page || '1');
  const limit = parseInt(searchParams.limit || '12');
  const totalPages = Math.ceil(total / limit);

  return (
    <>
      <AdminSubscriptionsDataTable data={subscriptions} />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className='mt-6'>
          <AdminTablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            currentLimit={limit}
            basePath='/admin/subscriptions'
          />
        </div>
      )}
    </>
  );
}
