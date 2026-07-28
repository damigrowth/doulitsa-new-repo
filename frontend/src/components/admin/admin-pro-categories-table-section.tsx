import { AdminProCategoriesDataTable } from './admin-pro-categories-data-table';
import { getTaxonomyData } from '@/actions/admin/taxonomy-helpers';
import { isSuccess } from '@/lib/types/server-actions';
import {
  processTableData,
  TableSectionWrapper,
  standardSearchFilter,
  BaseSearchParams,
} from './utils/table-section-utils';

interface ProCategoriesTableSectionProps {
  searchParams: BaseSearchParams;
}

export async function AdminProCategoriesTableSection({
  searchParams,
}: ProCategoriesTableSectionProps) {
  // Map categories with child count from Git
  const result = await getTaxonomyData('pro-categories');
  const proTaxonomies = isSuccess(result) ? result.data : [];
  const categories = proTaxonomies.map((cat) => ({
    id: cat.id,
    label: cat.label,
    slug: cat.slug,
    plural: cat.plural,
    description: cat.description,
    childCount: cat.children?.length || 0,
  }));

  const { paginatedData, totalPages, currentPage, currentLimit } = processTableData({
    data: categories,
    searchParams,
    basePath: '/admin/taxonomies/pro/categories',
    defaultLimit: 20,
    filterFn: standardSearchFilter,
  });

  return (
    <TableSectionWrapper
      totalPages={totalPages}
      currentPage={currentPage}
      currentLimit={currentLimit}
      basePath='/admin/taxonomies/pro/categories'
    >
      <AdminProCategoriesDataTable categories={paginatedData} />
    </TableSectionWrapper>
  );
}
