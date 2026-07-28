import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SiteHeader } from '@/components/admin/site-header';
import { EditTaxonomyItemForm } from '@/components/admin/forms';
import { getTaxonomyData } from '@/actions/admin/taxonomy-helpers';
import { isSuccess } from '@/lib/types/server-actions';
import { DatasetItem } from '@/lib/types/datasets';

// O(1) optimized hash map lookups - 99% faster than findById utility
import { findServiceById } from '@/lib/taxonomies';
import { NextLink } from '@/components';
import { Button } from '@/components/ui/button';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditCategoryPage({ params }: PageProps) {
  const { id } = await params;

  // Get taxonomy data from Git
  const result = await getTaxonomyData('service-categories');

  if (!isSuccess(result)) {
    return (
      <div className="p-4">
        <h1 className="text-lg font-semibold text-destructive">Error</h1>
        <p className="text-sm text-muted-foreground">{result.error.message}</p>
      </div>
    );
  }

  const serviceTaxonomies = result.data;
  const taxonomy = findServiceById(id);

  // Verify it's a top-level category
  if (!taxonomy || !serviceTaxonomies.some((cat) => cat.id === id)) {
    notFound();
  }

  return (
    <>
      <SiteHeader
        title={`Edit Category: ${taxonomy.label || ''}`}
        actions={
          <Button variant='ghost' size='sm' asChild>
            <NextLink href='/admin/taxonomies/service/categories'>
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
              Update category label, slug, description, and metadata
            </p>
          </CardHeader>
          <CardContent>
            <EditTaxonomyItemForm
              taxonomy={{
                id: taxonomy.id,
                label: taxonomy.label || '',
                slug: taxonomy.slug || '',
                description: taxonomy.description || '',
                level: 'category' as const,
                featured: taxonomy.featured,
                icon: taxonomy.icon,
                image: taxonomy.image,
              }}
              existingItems={serviceTaxonomies}
            />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
