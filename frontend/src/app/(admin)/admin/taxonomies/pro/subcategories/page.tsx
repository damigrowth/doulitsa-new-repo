import {
  TaxonomyListPage,
  type TaxonomyListPageConfig,
} from '@/components/admin/taxonomy-list-page';
import { AdminProSubcategoriesFilters } from '@/components/admin/admin-pro-subcategories-filters';
import { AdminProSubcategoriesTableSection } from '@/components/admin/admin-pro-subcategories-table-section';
import { AdminProSubcategoriesTableSkeleton } from '@/components/admin/admin-pro-subcategories-table-skeleton';
import { getProTaxonomies } from '@/lib/taxonomies';

export const dynamic = 'force-dynamic';

interface ProSubcategoriesPageProps {
  searchParams: Promise<{
    page?: string;
    limit?: string;
    search?: string;
    type?: string;
    category?: string;
    sortBy?: string;
    sortOrder?: string;
  }>;
}

export default async function ProSubcategoriesPage({
  searchParams,
}: ProSubcategoriesPageProps) {
  const params = await searchParams;

  // Prepare taxonomy data server-side to prevent client-side bundle bloat
  const proTaxonomies = getProTaxonomies();
  const categoryOptions = proTaxonomies.map((category) => ({
    value: category.id,
    label: category.label,
  }));

  const config: TaxonomyListPageConfig = {
    title: 'Pro Subcategories',
    createPath: '/admin/taxonomies/pro/subcategories/create',
    createLabel: 'Create Subcategory',
    FiltersComponent: AdminProSubcategoriesFilters,
    TableComponent: AdminProSubcategoriesTableSection,
    SkeletonComponent: AdminProSubcategoriesTableSkeleton,
    categoryOptions, // Pass to client component via props
  };

  return <TaxonomyListPage config={config} searchParams={params} />;
}
