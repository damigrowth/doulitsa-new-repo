import { getTaxonomyData } from '@/actions/admin/taxonomy-helpers';
import { isSuccess } from '@/lib/types/server-actions';
import { AdminSubdivisionsDataTable } from './admin-subdivisions-data-table';
import type { DatasetItem } from '@/lib/types/datasets';
import {
  processTableData,
  TableSectionWrapper,
  standardSearchFilter,
  combineFilters,
  standardSortFn,
  BaseSearchParams,
} from './utils/table-section-utils';

interface SubdivisionItem extends DatasetItem {
  categoryLabel?: string;
  subcategoryLabel?: string;
  parentCategoryId?: string;
  parentSubcategoryId?: string;
}

interface AdminSubdivisionsTableSectionProps {
  searchParams: BaseSearchParams;
}

export async function AdminSubdivisionsTableSection({
  searchParams,
}: AdminSubdivisionsTableSectionProps) {
  // Flatten subdivisions from all categories and subcategories from Git
  const result = await getTaxonomyData('service-categories');
  const serviceTaxonomies = isSuccess(result) ? result.data : [];
  const subdivisions: SubdivisionItem[] = [];
  serviceTaxonomies.forEach((category) => {
    category.children?.forEach((subcategory) => {
      subcategory.children?.forEach((subdivision) => {
        subdivisions.push({
          ...subdivision,
          categoryLabel: category.label,
          subcategoryLabel: subcategory.label,
          parentCategoryId: category.id,
          parentSubcategoryId: subcategory.id,
        });
      });
    });
  });

  const categoryFilter = (item: SubdivisionItem, params: BaseSearchParams) => {
    const { category } = params;
    return !category || category === 'all' || item.parentCategoryId === category;
  };

  const subcategoryFilter = (item: SubdivisionItem, params: BaseSearchParams) => {
    const { subcategory } = params;
    return !subcategory || subcategory === 'all' || item.parentSubcategoryId === subcategory;
  };

  const { paginatedData, totalPages, currentPage, currentLimit } = processTableData({
    data: subdivisions,
    searchParams,
    basePath: '/admin/taxonomies/service/subdivisions',
    filterFn: combineFilters(standardSearchFilter, categoryFilter, subcategoryFilter),
    sortFn: standardSortFn,
  });

  return (
    <TableSectionWrapper
      totalPages={totalPages}
      currentPage={currentPage}
      currentLimit={currentLimit}
      basePath='/admin/taxonomies/service/subdivisions'
    >
      <AdminSubdivisionsDataTable
        data={paginatedData}
        loading={false}
        basePath='/admin/taxonomies/service'
      />
    </TableSectionWrapper>
  );
}
