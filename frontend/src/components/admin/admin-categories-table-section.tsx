import { AdminCategoriesDataTable } from './admin-categories-data-table';
import { getTaxonomyData } from '@/actions/admin/taxonomy-helpers';
import { isSuccess } from '@/lib/types/server-actions';
import { DatasetItem } from '@/lib/types/datasets';
import {
  processTableData,
  TableSectionWrapper,
  standardSearchFilter,
  combineFilters,
  BaseSearchParams,
} from './utils/table-section-utils';

interface AdminCategoriesTableSectionProps {
  searchParams: BaseSearchParams;
}

interface CategoryItem extends DatasetItem {
  subcategoryCount: number;
}

export async function AdminCategoriesTableSection({
  searchParams,
}: AdminCategoriesTableSectionProps) {
  // Get categories with subcategory counts from Git
  const result = await getTaxonomyData('service-categories');
  const serviceTaxonomies = isSuccess(result) ? result.data : [];
  const categories: CategoryItem[] = serviceTaxonomies.map((category) => ({
    ...category,
    subcategoryCount: category.children?.length || 0,
  }));

  const featuredFilter = (item: CategoryItem, params: BaseSearchParams) => {
    const { featured } = params;
    return !featured || featured === 'all' || item.featured === featured;
  };

  const { paginatedData, totalPages, currentPage, currentLimit } = processTableData({
    data: categories,
    searchParams,
    basePath: '/admin/taxonomies/service/categories',
    filterFn: combineFilters(standardSearchFilter, featuredFilter),
  });

  return (
    <TableSectionWrapper
      totalPages={totalPages}
      currentPage={currentPage}
      currentLimit={currentLimit}
      basePath='/admin/taxonomies/service/categories'
    >
      <AdminCategoriesDataTable data={paginatedData} />
    </TableSectionWrapper>
  );
}
