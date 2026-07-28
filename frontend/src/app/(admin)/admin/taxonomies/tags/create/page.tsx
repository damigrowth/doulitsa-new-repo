import { TaxonomyCreatePage } from '@/components/admin/taxonomy-create-page';
import { CreateTagForm } from '@/components/admin/forms/create-tag-form';
import { getTaxonomyData } from '@/actions/admin/taxonomy-helpers';
import { isSuccess } from '@/lib/types/server-actions';

export const dynamic = 'force-dynamic';

export default async function CreateTagPage() {
  // Fetch taxonomy data from Git
  const result = await getTaxonomyData('tags');

  if (!isSuccess(result)) {
    return (
      <div className="p-4">
        <h1 className="text-lg font-semibold text-destructive">Error</h1>
        <p className="text-sm text-muted-foreground">{result.error.message}</p>
      </div>
    );
  }

  const tags = result.data;

  return (
    <TaxonomyCreatePage
      title='Create Tag'
      backPath='/admin/taxonomies/tags'
      backLabel='Back to Tags'
      description='Add a new tag with label and slug'
    >
      <CreateTagForm existingItems={tags} />
    </TaxonomyCreatePage>
  );
}
