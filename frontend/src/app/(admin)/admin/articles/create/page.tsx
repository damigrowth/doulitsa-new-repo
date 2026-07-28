import { requirePermission } from '@/actions/auth/server';
import { ADMIN_RESOURCES } from '@/lib/auth/roles';
import { getAllBlogCategories } from '@/constants/datasets/blog-categories';
import { adminProfiles } from '@/lib/api/admin';

import { SiteHeader } from '@/components/admin/site-header';
import { ArticleForm } from '@/components/admin/article-form';

export const dynamic = 'force-dynamic';

export default async function CreateArticlePage() {
  await requirePermission(ADMIN_RESOURCES.BLOG, '/admin');

  const categories = getAllBlogCategories();

  // Pull a list of professional profiles to populate the author selector.
  // Use the existing admin profile-search endpoint with an empty query =>
  // returns up to 50 published profiles.
  type AdminProfile = {
    id: string;
    displayName: string | null;
    username: string | null;
    email: string | null;
    image: string | null;
  };
  let profiles: AdminProfile[] = [];
  try {
    profiles = (await adminProfiles.search('')) as AdminProfile[];
  } catch {
    profiles = [];
  }

  const profileOptions = profiles.map((p) => ({
    id: p.id,
    label: p.displayName || p.username || 'Unknown',
    email: p.email || '',
    image: p.image || '',
  }));

  return (
    <>
      <SiteHeader title='Νέο Άρθρο' />
      <div className='flex flex-col gap-4 pb-6 pt-4 md:gap-6'>
        <div className='mx-auto w-full max-w-5xl px-4 lg:px-6'>
          <ArticleForm categories={categories} profileOptions={profileOptions} />
        </div>
      </div>
    </>
  );
}
