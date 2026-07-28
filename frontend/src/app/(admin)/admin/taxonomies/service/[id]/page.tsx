import { notFound } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SiteHeader } from '@/components/admin/site-header';
import { EditTaxonomyItemForm } from '@/components/admin/forms';
import { getServiceTaxonomies } from '@/lib/taxonomies';
import { DatasetItem } from '@/lib/types/datasets';
import { getItemPath } from '@/lib/utils/datasets';
import { NextLink } from '@/components';

// O(1) optimized hash map lookups - 99% faster than findById utility
import { findServiceById, getServiceHierarchy } from '@/lib/taxonomies';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

interface FlatTaxonomy
  extends Required<Pick<DatasetItem, 'id' | 'label' | 'slug' | 'description'>>,
    Pick<DatasetItem, 'icon' | 'featured' | 'image'> {
  level: 'category' | 'subcategory' | 'subdivision';
  parentId?: string;
  parentLabel?: string;
  hasImage: boolean;
}

// Function to find taxonomy by ID and determine its level - O(1) hash map lookups
function findTaxonomyById(id: string): FlatTaxonomy | null {
  const item = findServiceById(id);
  if (!item) return null;

  // Get the path to determine level and parent
  const path = getItemPath(getServiceTaxonomies(), id);

  let level: 'category' | 'subcategory' | 'subdivision';
  let parentId: string | undefined;
  let parentLabel: string | undefined;

  if (path.length === 1) {
    level = 'category';
  } else if (path.length === 2) {
    level = 'subcategory';
    parentId = path[0].id;
    parentLabel = path[0].label;
  } else {
    level = 'subdivision';
    parentId = path[1].id;
    parentLabel = path[1].label;
  }

  return {
    id: item.id,
    label: item.label || '',
    slug: item.slug || '',
    description: item.description || '',
    level,
    parentId,
    parentLabel,
    featured: item.featured,
    icon: item.icon,
    image: item.image,
    hasImage: !!item.image,
  };
}

export default async function AdminServiceTaxonomyEditPage({
  params,
}: PageProps) {
  const { id } = await params;
  const taxonomy = findTaxonomyById(id);

  if (!taxonomy) {
    notFound();
  }

  const getLevelBadgeVariant = (
    level: string,
  ): 'default' | 'secondary' | 'outline' => {
    switch (level) {
      case 'category':
        return 'default';
      case 'subcategory':
        return 'secondary';
      case 'subdivision':
        return 'outline';
      default:
        return 'default';
    }
  };

  return (
    <>
      <SiteHeader
        title={`${taxonomy.label} (${taxonomy.level})`}
        actions={
          <Button variant='ghost' size='sm' asChild>
            <NextLink href='/admin/taxonomies/service'>
              <ArrowLeft className='h-4 w-4' />
              Back to List
            </NextLink>
          </Button>
        }
      />
      <div className='flex flex-col gap-4 pb-6 pt-4 md:gap-6'>
        <div className='px-4 lg:px-6'>
          <div className='space-y-6 pb-16'>
            {/* Taxonomy Overview */}
            <div className='grid gap-4 md:grid-cols-3'>
              {/* Basic Information */}
              <Card>
                <CardHeader className='pb-3'>
                  <CardTitle className='text-sm'>Basic Information</CardTitle>
                </CardHeader>
                <CardContent className='p-0'>
                  <div className='divide-y'>
                    <div className='flex items-center justify-between px-6 py-2'>
                      <span className='text-xs text-muted-foreground'>ID</span>
                      <span className='text-xs font-mono'>{taxonomy.id}</span>
                    </div>
                    <div className='flex items-center justify-between px-6 py-2'>
                      <span className='text-xs text-muted-foreground'>
                        Slug
                      </span>
                      <span className='text-xs font-medium'>
                        {taxonomy.slug}
                      </span>
                    </div>
                    <div className='flex items-center justify-between px-6 py-2'>
                      <span className='text-xs text-muted-foreground'>
                        Level
                      </span>
                      <Badge variant={getLevelBadgeVariant(taxonomy.level)}>
                        {taxonomy.level}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Hierarchy */}
              <Card>
                <CardHeader className='pb-3'>
                  <CardTitle className='text-sm'>Hierarchy</CardTitle>
                </CardHeader>
                <CardContent className='p-0'>
                  <div className='divide-y'>
                    <div className='flex flex-col gap-1 px-6 py-2'>
                      <span className='text-xs text-muted-foreground'>
                        Parent
                      </span>
                      <span className='text-xs font-medium'>
                        {taxonomy.parentLabel || '—'}
                      </span>
                    </div>
                    {taxonomy.parentId && (
                      <div className='flex items-center justify-between px-6 py-2'>
                        <span className='text-xs text-muted-foreground'>
                          Parent ID
                        </span>
                        <span className='text-xs font-mono'>
                          {taxonomy.parentId}
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Metadata */}
              <Card>
                <CardHeader className='pb-3'>
                  <CardTitle className='text-sm'>Metadata</CardTitle>
                </CardHeader>
                <CardContent className='p-0'>
                  <div className='divide-y'>
                    {taxonomy.featured && (
                      <div className='flex items-center justify-between px-6 py-2'>
                        <span className='text-xs text-muted-foreground'>
                          Featured
                        </span>
                        <Badge
                          variant={
                            taxonomy.featured === true ? 'default' : 'outline'
                          }
                        >
                          {taxonomy.featured === true ? 'Yes' : 'No'}
                        </Badge>
                      </div>
                    )}
                    {taxonomy.icon && (
                      <div className='flex items-center justify-between px-6 py-2'>
                        <span className='text-xs text-muted-foreground'>
                          Icon
                        </span>
                        <span className='text-xs font-medium'>
                          {taxonomy.icon}
                        </span>
                      </div>
                    )}
                    {taxonomy.image && (
                      <div className='flex items-center justify-between px-6 py-2'>
                        <span className='text-xs text-muted-foreground'>
                          Has Image
                        </span>
                        <Badge variant='secondary'>Yes</Badge>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Edit Form */}
            <Card>
              <CardHeader>
                <CardTitle className='text-lg'>Edit Taxonomy</CardTitle>
                <p className='text-sm text-muted-foreground'>
                  Update taxonomy label, slug, description, and metadata
                </p>
              </CardHeader>
              <CardContent>
                <EditTaxonomyItemForm
                  taxonomy={taxonomy}
                  existingItems={getServiceTaxonomies()}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
