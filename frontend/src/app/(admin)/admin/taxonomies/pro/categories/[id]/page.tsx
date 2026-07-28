import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { SiteHeader } from '@/components/admin/site-header';
import { EditProTaxonomyForm } from '@/components/admin/forms/edit-pro-taxonomy-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getTaxonomyData } from '@/actions/admin/taxonomy-helpers';
import { isSuccess } from '@/lib/types/server-actions';
import { NextLink } from '@/components';

// O(1) optimized hash map lookups - 99% faster than findById utility
import { findProById } from '@/lib/taxonomies';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditProCategoryPage({ params }: PageProps) {
  const { id } = await params;

  // Get taxonomy data from Git
  const result = await getTaxonomyData('pro-categories');

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

  // Verify it's a top-level category
  if (!taxonomy || !proTaxonomies.some((cat) => cat.id === id)) {
    notFound();
  }

  return (
    <>
      <SiteHeader
        title={`Edit Category: ${taxonomy.label || ''}`}
        actions={
          <Button variant='ghost' size='sm' asChild>
            <NextLink href='/admin/taxonomies/pro/categories'>
              <ArrowLeft className='h-4 w-4' />
              Back to Categories
            </NextLink>
          </Button>
        }
      />
      <div className='mx-auto w-full max-w-5xl px-4 lg:px-6 flex flex-col gap-4 pb-16 pt-4'>
        <Card>
          <CardHeader>
            <CardTitle className='text-lg'>Edit Category</CardTitle>
            <p className='text-sm text-muted-foreground'>
              Update category label, slug, and description
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
                level: 'category' as const,
              }}
              existingItems={proTaxonomies}
            />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
