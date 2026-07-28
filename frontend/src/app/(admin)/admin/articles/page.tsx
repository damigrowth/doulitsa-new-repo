import { Suspense } from 'react';
import { SiteHeader } from '@/components/admin/site-header';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { NextLink } from '@/components';
import { requirePermission } from '@/actions/auth/server';
import { ADMIN_RESOURCES } from '@/lib/auth/roles';
import { AdminArticlesFilters } from '@/components/admin/admin-articles-filters';
import { AdminArticlesTableSection } from '@/components/admin/admin-articles-table-section';
import { AdminArticlesTableSkeleton } from '@/components/admin/admin-articles-table-skeleton';

export const dynamic = 'force-dynamic';

interface ArticlesPageProps {
  searchParams: Promise<{
    page?: string;
    status?: string;
    category?: string;
    search?: string;
  }>;
}

export default async function ArticlesPage({
  searchParams,
}: ArticlesPageProps) {
  await requirePermission(ADMIN_RESOURCES.BLOG, '/admin');
  const params = await searchParams;

  return (
    <>
      <SiteHeader
        title='Άρθρα'
        actions={
          <Button variant='default' size='md' asChild>
            <NextLink href='/admin/articles/create'>
              <Plus className='h-4 w-4' />
              Νέο Άρθρο
            </NextLink>
          </Button>
        }
      />
      <div className='flex flex-col gap-4 pb-6 pt-4 md:gap-6'>
        <div className='px-4 lg:px-6'>
          <div className='space-y-6'>
            <AdminArticlesFilters />
            <Suspense
              key={JSON.stringify(params)}
              fallback={<AdminArticlesTableSkeleton />}
            >
              <AdminArticlesTableSection searchParams={params} />
            </Suspense>
          </div>
        </div>
      </div>
    </>
  );
}
