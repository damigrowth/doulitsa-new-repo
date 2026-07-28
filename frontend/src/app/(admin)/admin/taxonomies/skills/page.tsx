import {
  TaxonomyListPage,
  type TaxonomyListPageConfig,
} from '@/components/admin/taxonomy-list-page';
import { AdminSkillsFilters } from '@/components/admin/admin-skills-filters';
import { AdminSkillsTableSection } from '@/components/admin/admin-skills-table-section';
import { AdminSkillsTableSkeleton } from '@/components/admin/admin-skills-table-skeleton';
import { getProTaxonomies } from '@/lib/taxonomies';

export const dynamic = 'force-dynamic';

interface SkillsPageProps {
  searchParams: Promise<{
    page?: string;
    limit?: string;
    search?: string;
    category?: string;
    sortBy?: string;
    sortOrder?: string;
  }>;
}

export default async function SkillsPage({ searchParams }: SkillsPageProps) {
  const params = await searchParams;

  // Prepare taxonomy data server-side to prevent client-side bundle bloat
  const proTaxonomies = getProTaxonomies();
  const categoryOptions = proTaxonomies.map((category) => ({
    value: category.id,
    label: category.label,
  }));

  // Create category lookup for data table column renderer
  const categoryLookup = Object.fromEntries(
    proTaxonomies.map((cat) => [cat.id, cat.label])
  );

  const config: TaxonomyListPageConfig = {
    title: 'Skills',
    createPath: '/admin/taxonomies/skills/create',
    createLabel: 'Create Skill',
    FiltersComponent: AdminSkillsFilters,
    TableComponent: AdminSkillsTableSection,
    SkeletonComponent: AdminSkillsTableSkeleton,
    categoryOptions, // Pass to client filter component via props
    categoryLookup, // Pass to data table for category resolution
  };

  return <TaxonomyListPage config={config} searchParams={params} />;
}
