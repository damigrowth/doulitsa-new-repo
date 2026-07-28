import { AdminArticlesDataTable } from './admin-articles-data-table';
import { listArticlesAdmin } from '@/actions/blog/manage-articles';

interface AdminArticlesTableSectionProps {
  searchParams: {
    page?: string;
    status?: string;
    category?: string;
    search?: string;
  };
}

export async function AdminArticlesTableSection({
  searchParams,
}: AdminArticlesTableSectionProps) {
  const page = parseInt(searchParams.page || '1');

  const result = await listArticlesAdmin({
    page,
    limit: 50,
    status: searchParams.status && searchParams.status !== 'all'
      ? searchParams.status
      : undefined,
    categorySlug: searchParams.category && searchParams.category !== 'all'
      ? searchParams.category
      : undefined,
    search: searchParams.search || undefined,
  });

  if (!result.success) {
    return (
      <div className='text-destructive'>
        Σφάλμα: {result.error || 'Αποτυχία φόρτωσης άρθρων'}
      </div>
    );
  }

  const articles = result.data?.articles || [];

  return <AdminArticlesDataTable data={articles} />;
}
