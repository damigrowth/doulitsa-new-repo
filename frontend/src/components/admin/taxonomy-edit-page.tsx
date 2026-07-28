import { notFound } from 'next/navigation';
import { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SiteHeader } from '@/components/admin/site-header';
import type { DatasetItem } from '@/lib/types/datasets';
import { findById } from '@/lib/utils/datasets';
import { NextLink } from '@/components';

export interface TaxonomyEditPageProps<T extends DatasetItem> {
  id: string;
  items: T[];
  entityName: string;
  backPath: string;
  backLabel: string;
  description: string;
  children: (item: T) => ReactNode;
  customFindItem?: (items: T[], id: string) => T | undefined;
}

export function TaxonomyEditPage<T extends DatasetItem>({
  id,
  items,
  entityName,
  backPath,
  backLabel,
  description,
  children,
  customFindItem,
}: TaxonomyEditPageProps<T>) {
  const item = customFindItem ? customFindItem(items, id) : findById(items, id);

  if (!item) notFound();

  const displayName = item.label || item.name || id;

  return (
    <>
      <SiteHeader
        title={`Edit ${entityName}: ${displayName}`}
        actions={
          <Button variant='ghost' size='sm' asChild>
            <NextLink href={backPath}>
              <ArrowLeft className='h-4 w-4' />
              {backLabel}
            </NextLink>
          </Button>
        }
      />
      <div className='mx-auto w-full max-w-5xl px-4 lg:px-6 flex flex-col gap-4 pb-16 pt-4'>
        <Card>
          <CardHeader>
            <CardTitle className='text-lg'>Edit {entityName}</CardTitle>
            <p className='text-sm text-muted-foreground'>{description}</p>
          </CardHeader>
          <CardContent>{children(item)}</CardContent>
        </Card>
      </div>
    </>
  );
}
