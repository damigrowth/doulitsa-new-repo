import { AdminSubcategoriesFilters } from '@/components/admin/admin-subcategories-filters';
import { AdminSubcategoriesTableSection } from '@/components/admin/admin-subcategories-table-section';
import { AdminSubcategoriesTableSkeleton } from '@/components/admin/admin-subcategories-table-skeleton';
import {
  TaxonomyListPage,
  TaxonomyListPageConfig,
} from '@/components/admin/taxonomy-list-page';
import { getServiceTaxonomies } from '@/lib/taxonomies';

export const dynamic = 'force-dynamic';

interface SubcategoriesPageProps {
  searchParams: Promise<{
    page?: string;
    limit?: string;
    search?: string;
    category?: string;
    sortBy?: string;
    sortOrder?: string;
  }>;
}

export default async function SubcategoriesPage({
  searchParams,
}: SubcategoriesPageProps) {
  const params = await searchParams;

  // Prepare taxonomy data server-side to prevent client-side bundle bloat
  const serviceTaxonomies = getServiceTaxonomies();
  const categoryOptions = serviceTaxonomies.map((category) => ({
    value: category.id,
    label: category.label,
  }));

  const config: TaxonomyListPageConfig = {
    title: 'Service Subcategories',
    createPath: '/admin/taxonomies/service/subcategories/create',
    createLabel: 'Create Subcategory',
    FiltersComponent: AdminSubcategoriesFilters,
    TableComponent: AdminSubcategoriesTableSection,
    SkeletonComponent: AdminSubcategoriesTableSkeleton,
    categoryOptions, // Pass to client component via props
  };

  return <TaxonomyListPage config={config} searchParams={params} />;
}
