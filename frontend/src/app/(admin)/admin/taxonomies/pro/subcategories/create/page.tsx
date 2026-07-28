import { TaxonomyCreatePage } from '@/components/admin/taxonomy-create-page';
import { CreateProTaxonomyForm } from '@/components/admin/forms/create-pro-taxonomy-form';
import { getTaxonomyData } from '@/actions/admin/taxonomy-helpers';
import { isSuccess } from '@/lib/types/server-actions';

export const dynamic = 'force-dynamic';

export default async function CreateProSubcategoryPage() {
  // Fetch taxonomy data from Git
  const result = await getTaxonomyData('pro-subcategories');

  if (!isSuccess(result)) {
    return (
      <div className="p-4">
        <h1 className="text-lg font-semibold text-destructive">Error</h1>
        <p className="text-sm text-muted-foreground">{result.error.message}</p>
      </div>
    );
  }

  const proTaxonomies = result.data;

  return (
    <TaxonomyCreatePage
      title='Create Professional Subcategory'
      backPath='/admin/taxonomies/pro/subcategories'
      backLabel='Back to Subcategories'
      description='Add a new subcategory under an existing professional category'
    >
      <CreateProTaxonomyForm
        level='subcategory'
        existingItems={proTaxonomies}
      />
    </TaxonomyCreatePage>
  );
}
