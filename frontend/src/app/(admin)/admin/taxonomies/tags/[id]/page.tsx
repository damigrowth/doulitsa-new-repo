import { TaxonomyEditPage } from '@/components/admin/taxonomy-edit-page';
import { EditTagForm } from '@/components/admin/forms/edit-tag-form';
import { getTaxonomyData } from '@/actions/admin/taxonomy-helpers';
import { isSuccess } from '@/lib/types/server-actions';

export const dynamic = 'force-dynamic';

interface TagDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function TagDetailPage({ params }: TagDetailPageProps) {
  const { id } = await params;

  // Get tags from Git
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
    <TaxonomyEditPage
      id={id}
      items={tags}
      entityName='Tag'
      backPath='/admin/taxonomies/tags'
      backLabel='Back to Tags'
      description='Update tag label, slug, and description'
      customFindItem={(items, id) => items.find((t) => t.id === id)}
    >
      {(tag) => <EditTagForm tag={tag} existingItems={tags} />}
    </TaxonomyEditPage>
  );
}
