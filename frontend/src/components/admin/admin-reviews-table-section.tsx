import { listReviews } from '@/actions/admin/reviews';
import { AdminReviewsDataTable } from './admin-reviews-data-table';
import AdminTablePagination from './admin-table-pagination';

interface AdminReviewsTableSectionProps {
  searchParams: {
    page?: string;
    limit?: string;
    search?: string;
    status?: string;
    rating?: string;
    type?: string;
    sortBy?: string;
    sortOrder?: string;
  };
}

export async function AdminReviewsTableSection({
  searchParams,
}: AdminReviewsTableSectionProps) {
  // Parse pagination params
  const page = Number(searchParams.page) || 1;
  const limit = Number(searchParams.limit) || 10;
  const offset = (page - 1) * limit;

  // Parse filter params
  const searchQuery = searchParams.search || undefined;
  const status = searchParams.status as
    | 'all'
    | 'pending'
    | 'approved'
    | 'rejected'
    | undefined;
  const rating = searchParams.rating as
    | 'all'
    | '1'
    | '2'
    | '3'
    | '4'
    | '5'
    | undefined;
  const type = searchParams.type as 'all' | 'SERVICE' | 'PROFILE' | undefined;

  // Parse sort params
  const sortBy = (searchParams.sortBy as
    | 'createdAt'
    | 'updatedAt'
    | 'rating'
    | undefined) || 'createdAt';
  const sortDirection = (searchParams.sortOrder as 'asc' | 'desc' | undefined) || 'desc';

  // Fetch reviews
  const result = await listReviews({
    searchQuery,
    status,
    rating,
    type,
    limit,
    offset,
    sortBy,
    sortDirection,
  });

  if (!result.success || !result.data) {
    return (
      <div className='flex items-center justify-center p-8'>
        <p className='text-muted-foreground'>
          {result.error || 'Failed to load reviews'}
        </p>
      </div>
    );
  }

  const { reviews, total } = result.data;
  const totalPages = Math.ceil(total / limit);

  return (
    <div className='space-y-4'>
      <AdminReviewsDataTable data={reviews} loading={false} />

      {totalPages > 1 && (
        <AdminTablePagination
          currentPage={page}
          totalPages={totalPages}
          currentLimit={limit}
          basePath='/admin/reviews'
        />
      )}
    </div>
  );
}
