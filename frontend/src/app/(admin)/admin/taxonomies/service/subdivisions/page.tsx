import { AdminSubdivisionsFilters } from '@/components/admin/admin-subdivisions-filters';
import { AdminSubdivisionsTableSection } from '@/components/admin/admin-subdivisions-table-section';
import { AdminSubdivisionsTableSkeleton } from '@/components/admin/admin-subdivisions-table-skeleton';
import {
  TaxonomyListPage,
  TaxonomyListPageConfig,
} from '@/components/admin/taxonomy-list-page';
import { getServiceTaxonomies } from '@/lib/taxonomies';

export const dynamic = 'force-dynamic';

interface SubdivisionsPageProps {
  searchParams: Promise<{
    page?: string;
    limit?: string;
    search?: string;
    category?: string;
    subcategory?: string;
    sortBy?: string;
    sortOrder?: string;
  }>;
}

export default async function SubdivisionsPage({
  searchParams,
}: SubdivisionsPageProps) {
  const params = await searchParams;

  // Prepare full taxonomy tree server-side for dynamic category→subcategory dropdown
  const serviceTaxonomies = getServiceTaxonomies();

  const config: TaxonomyListPageConfig = {
    title: 'Service Subdivisions',
    createPath: '/admin/taxonomies/service/subdivisions/create',
    createLabel: 'Create Subdivision',
    FiltersComponent: AdminSubdivisionsFilters,
    TableComponent: AdminSubdivisionsTableSection,
    SkeletonComponent: AdminSubdivisionsTableSkeleton,
    taxonomyTree: serviceTaxonomies, // Pass full tree for dynamic dropdown
  };

  return <TaxonomyListPage config={config} searchParams={params} />;
}
