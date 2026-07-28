import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { SiteHeader } from '@/components/admin/site-header';
import { EditProTaxonomyForm } from '@/components/admin/forms/edit-pro-taxonomy-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getTaxonomyData } from '@/actions/admin/taxonomy-helpers';
import { isSuccess } from '@/lib/types/server-actions';
import { getItemPath } from '@/lib/utils/datasets';
import { NextLink } from '@/components';

// O(1) optimized hash map lookups - 99% faster than findById utility
import { findProById } from '@/lib/taxonomies';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditProSubcategoryPage({ params }: PageProps) {
  const { id } = await params;

  // Get taxonomy data from Git
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
  const taxonomy = findProById(id);
  const path = getItemPath(proTaxonomies, id);

  // Subcategories have exactly 2 levels (category > subcategory)
  if (!taxonomy || path.length !== 2) {
    notFound();
  }

  const parentCategory = path[0];

  return (
    <>
      <SiteHeader
        title={`Edit Subcategory: ${taxonomy.label || ''}`}
        actions={
          <Button variant='ghost' size='sm' asChild>
            <NextLink href='/admin/taxonomies/pro/subcategories'>
              <ArrowLeft className='h-4 w-4' />
              Back to Subcategories
            </NextLink>
          </Button>
        }
      />
      <div className='mx-auto w-full max-w-5xl px-4 lg:px-6 flex flex-col gap-4 pb-16 pt-4'>
        <Card>
          <CardHeader>
            <CardTitle className='text-lg'>Edit Subcategory</CardTitle>
            <p className='text-sm text-muted-foreground'>
              Update subcategory label, slug, and description
            </p>
          </CardHeader>
          <CardContent>
            <EditProTaxonomyForm
              taxonomy={{
                id: taxonomy.id,
                label: taxonomy.label || '',
                slug: taxonomy.slug || '',
                plural: taxonomy.plural || '',
                description: taxonomy.description || '',
                level: 'subcategory' as const,
                parentId: parentCategory.id,
                parentLabel: parentCategory.label || '',
                type: (taxonomy as any).type,
              }}
              existingItems={proTaxonomies}
            />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
