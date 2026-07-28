import { AdminSubcategoriesDataTable } from './admin-subcategories-data-table';
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

interface AdminSubcategoriesTableSectionProps {
  searchParams: BaseSearchParams;
}

interface SubcategoryItem extends DatasetItem {
  subdivisionCount: number;
  categoryLabel?: string;
  parentCategoryId?: string;
}

export async function AdminSubcategoriesTableSection({
  searchParams,
}: AdminSubcategoriesTableSectionProps) {
  // Flatten subcategories with parent category info from Git
  const result = await getTaxonomyData('service-categories');
  const serviceTaxonomies = isSuccess(result) ? result.data : [];
  const subcategories: SubcategoryItem[] = [];
  serviceTaxonomies.forEach((category) => {
    category.children?.forEach((subcategory) => {
      subcategories.push({
        ...subcategory,
        subdivisionCount: subcategory.children?.length || 0,
        categoryLabel: category.label,
        parentCategoryId: category.id,
      });
    });
  });

  const categoryFilter = (item: SubcategoryItem, params: BaseSearchParams) => {
    const { category } = params;
    return !category || category === 'all' || item.parentCategoryId === category;
  };

  const { paginatedData, totalPages, currentPage, currentLimit } = processTableData({
    data: subcategories,
    searchParams,
    basePath: '/admin/taxonomies/service/subcategories',
    filterFn: combineFilters(standardSearchFilter, categoryFilter),
  });

  return (
    <TableSectionWrapper
      totalPages={totalPages}
      currentPage={currentPage}
      currentLimit={currentLimit}
      basePath='/admin/taxonomies/service/subcategories'
    >
      <AdminSubcategoriesDataTable data={paginatedData} />
    </TableSectionWrapper>
  );
}
