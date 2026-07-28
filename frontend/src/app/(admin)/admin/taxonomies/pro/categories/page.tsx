import {
  TaxonomyListPage,
  type TaxonomyListPageConfig,
} from '@/components/admin/taxonomy-list-page';
import { AdminProCategoriesFilters } from '@/components/admin/admin-pro-categories-filters';
import { AdminProCategoriesTableSection } from '@/components/admin/admin-pro-categories-table-section';
import { AdminProCategoriesTableSkeleton } from '@/components/admin/admin-pro-categories-table-skeleton';

export const dynamic = 'force-dynamic';

interface ProCategoriesPageProps {
  searchParams: Promise<{
    page?: string;
    limit?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: string;
  }>;
}

const config: TaxonomyListPageConfig = {
  title: 'Pro Categories',
  createPath: '/admin/taxonomies/pro/categories/create',
  createLabel: 'Create Category',
  FiltersComponent: AdminProCategoriesFilters,
  TableComponent: AdminProCategoriesTableSection,
  SkeletonComponent: AdminProCategoriesTableSkeleton,
};

export default async function ProCategoriesPage({
  searchParams,
}: ProCategoriesPageProps) {
  const params = await searchParams;
  return <TaxonomyListPage config={config} searchParams={params} />;
}
