import { TaxonomyCreatePage } from '@/components/admin/taxonomy-create-page';
import { CreateServiceTaxonomyForm } from '@/components/admin/forms/create-service-taxonomy-form';
import { getServiceTaxonomies } from '@/lib/taxonomies';

export const dynamic = 'force-dynamic';

export default function CreateCategoryPage() {
  return (
    <TaxonomyCreatePage
      title='Create Category'
      backPath='/admin/taxonomies/service/categories'
      backLabel='Back to Categories'
      description='Add a new top-level service category'
    >
      <CreateServiceTaxonomyForm level='category' existingItems={getServiceTaxonomies()} />
    </TaxonomyCreatePage>
  );
}
