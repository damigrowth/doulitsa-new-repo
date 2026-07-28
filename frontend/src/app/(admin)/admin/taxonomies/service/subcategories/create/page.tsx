import { getTaxonomyData } from '@/actions/admin/taxonomy-helpers';
import { isSuccess } from '@/lib/types/server-actions';
import { CreateServiceTaxonomyForm } from '@/components/admin/forms';
import { TaxonomyCreatePage } from '@/components/admin/taxonomy-create-page';

export const dynamic = 'force-dynamic';

export default async function CreateSubcategoryPage() {
  // Fetch taxonomy data from Git
  const result = await getTaxonomyData('service-subcategories');

  if (!isSuccess(result)) {
    return (
      <div className="p-4">
        <h1 className="text-lg font-semibold text-destructive">Error</h1>
        <p className="text-sm text-muted-foreground">{result.error.message}</p>
      </div>
    );
  }

  const serviceTaxonomies = result.data;

  return (
    <TaxonomyCreatePage
      title='Create Subcategory'
      backPath='/admin/taxonomies/service/subcategories'
      backLabel='Back to Subcategories'
      description='Add a new subcategory under an existing category'
    >
      <CreateServiceTaxonomyForm
        level='subcategory'
        existingItems={serviceTaxonomies}
      />
    </TaxonomyCreatePage>
  );
}
