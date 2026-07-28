import { notFound } from 'next/navigation';
import { requirePermission } from '@/actions/auth/server';
import { ADMIN_RESOURCES } from '@/lib/auth/roles';
import { getArticleAdmin } from '@/actions/blog/manage-articles';
import { getAllBlogCategories } from '@/constants/datasets/blog-categories';
import { adminProfiles } from '@/lib/api/admin';

import { SiteHeader } from '@/components/admin/site-header';
import { ArticleForm } from '@/components/admin/article-form';

export const dynamic = 'force-dynamic';

interface EditArticlePageProps {
  params: Promise<{ id: string }>;
}

export default async function EditArticlePage({ params }: EditArticlePageProps) {
  await requirePermission(ADMIN_RESOURCES.BLOG, '/admin');

  const { id } = await params;
  const categories = getAllBlogCategories();

  type AdminProfile = {
    id: string;
    displayName: string | null;
    username: string | null;
    email: string | null;
    image: string | null;
  };

  const [articleResult, profilesRaw] = await Promise.all([
    getArticleAdmin(id),
    adminProfiles.search('').catch(() => [] as AdminProfile[]),
  ]);
  const profiles = profilesRaw as AdminProfile[];

  if (!articleResult.success || !articleResult.data) {
    notFound();
  }

  const profileOptions = profiles.map((p) => ({
    id: p.id,
    label: p.displayName || p.username || 'Unknown',
    email: p.email || '',
    image: p.image || '',
  }));

  return (
    <>
      <SiteHeader title='Επεξεργασία Άρθρου' />
      <div className='flex flex-col gap-4 pb-6 pt-4 md:gap-6'>
        <div className='mx-auto w-full max-w-5xl px-4 lg:px-6'>
          <ArticleForm
            article={articleResult.data}
            categories={categories}
            profileOptions={profileOptions}
          />
        </div>
      </div>
    </>
  );
}
