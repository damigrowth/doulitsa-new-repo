import {
  TaxonomyListPage,
  type TaxonomyListPageConfig,
} from '@/components/admin/taxonomy-list-page';
import { AdminTagsFilters } from '@/components/admin/admin-tags-filters';
import { AdminTagsTableSection } from '@/components/admin/admin-tags-table-section';
import { AdminTagsTableSkeleton } from '@/components/admin/admin-tags-table-skeleton';

export const dynamic = 'force-dynamic';

const config: TaxonomyListPageConfig = {
  title: 'Tags',
  createPath: '/admin/taxonomies/tags/create',
  createLabel: 'Create Tag',
  FiltersComponent: AdminTagsFilters,
  TableComponent: AdminTagsTableSection,
  SkeletonComponent: AdminTagsTableSkeleton,
};

interface TagsPageProps {
  searchParams: Promise<{
    page?: string;
    limit?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: string;
  }>;
}

export default async function TagsPage({ searchParams }: TagsPageProps) {
  const params = await searchParams;
  return <TaxonomyListPage config={config} searchParams={params} />;
}
