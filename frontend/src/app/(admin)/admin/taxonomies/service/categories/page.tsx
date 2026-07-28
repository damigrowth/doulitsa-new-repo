import { AdminCategoriesFilters } from '@/components/admin/admin-categories-filters';
import { AdminCategoriesTableSection } from '@/components/admin/admin-categories-table-section';
import { AdminCategoriesTableSkeleton } from '@/components/admin/admin-categories-table-skeleton';
import {
  TaxonomyListPage,
  TaxonomyListPageConfig,
} from '@/components/admin/taxonomy-list-page';

export const dynamic = 'force-dynamic';

const config: TaxonomyListPageConfig = {
  title: 'Service Categories',
  createPath: '/admin/taxonomies/service/categories/create',
  createLabel: 'Create Category',
  FiltersComponent: AdminCategoriesFilters,
  TableComponent: AdminCategoriesTableSection,
  SkeletonComponent: AdminCategoriesTableSkeleton,
};

interface CategoriesPageProps {
  searchParams: Promise<{
    page?: string;
    limit?: string;
    search?: string;
    featured?: string;
    sortBy?: string;
    sortOrder?: string;
  }>;
}

export default async function CategoriesPage({
  searchParams,
}: CategoriesPageProps) {
  const params = await searchParams;
  return <TaxonomyListPage config={config} searchParams={params} />;
}
