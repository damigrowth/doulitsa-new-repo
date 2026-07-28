import { AdminProSubcategoriesDataTable } from './admin-pro-subcategories-data-table';
import { getTaxonomyData } from '@/actions/admin/taxonomy-helpers';
import { isSuccess } from '@/lib/types/server-actions';
import {
  processTableData,
  TableSectionWrapper,
  combineFilters,
  BaseSearchParams,
} from './utils/table-section-utils';

interface ProSubcategoriesTableSectionProps {
  searchParams: BaseSearchParams;
}

interface ProSubcategory {
  id: string;
  label: string;
  slug: string;
  plural: string;
  description: string;
  type: 'freelancer' | 'company';
  parentId: string;
  parentLabel: string;
}

export async function AdminProSubcategoriesTableSection({
  searchParams,
}: ProSubcategoriesTableSectionProps) {
  // Flatten subcategories with parent info from Git
  const result = await getTaxonomyData('pro-categories');
  const proTaxonomies = isSuccess(result) ? result.data : [];
  const subcategories: ProSubcategory[] = [];
  proTaxonomies.forEach((category) => {
    category.children?.forEach((sub) => {
      subcategories.push({
        id: sub.id,
        label: sub.label,
        slug: sub.slug,
        plural: sub.plural,
        description: sub.description,
        type: sub.type as 'freelancer' | 'company',
        parentId: category.id,
        parentLabel: category.label,
      });
    });
  });

  const searchFilter = (item: ProSubcategory, params: BaseSearchParams) => {
    const { search } = params;
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      item.label.toLowerCase().includes(searchLower) ||
      item.slug.toLowerCase().includes(searchLower) ||
      item.parentLabel.toLowerCase().includes(searchLower)
    );
  };

  const typeFilter = (item: ProSubcategory, params: BaseSearchParams) => {
    const { type } = params;
    return !type || type === 'all' || item.type === type;
  };

  const categoryFilter = (item: ProSubcategory, params: BaseSearchParams) => {
    const { category } = params;
    return !category || category === 'all' || item.parentId === category;
  };

  const { paginatedData, totalPages, currentPage, currentLimit } = processTableData({
    data: subcategories,
    searchParams,
    basePath: '/admin/taxonomies/pro/subcategories',
    defaultLimit: 20,
    filterFn: combineFilters(searchFilter, typeFilter, categoryFilter),
  });

  return (
    <TableSectionWrapper
      totalPages={totalPages}
      currentPage={currentPage}
      currentLimit={currentLimit}
      basePath='/admin/taxonomies/pro/subcategories'
    >
      <AdminProSubcategoriesDataTable subcategories={paginatedData} />
    </TableSectionWrapper>
  );
}
