import { BasicInfoForm, PortfolioForm } from '@/components';
import { getCurrentUser, requireProUser } from '@/actions/auth/server';
import { redirect } from 'next/navigation';
import { getDashboardMetadata } from '@/lib/seo/pages';
import { getProTaxonomies, getSkills } from '@/lib/taxonomies';
import type { DatasetOption, DatasetWithCategory } from '@/lib/types/datasets';
import { getUserTaxonomySubmissions } from '@/actions/taxonomy-submission';

export const metadata = getDashboardMetadata('Βασικά στοιχεία');

export default async function BasicPage() {
  // Require pro user type - redirects if type !== 'pro'
  await requireProUser();

  // Fetch current user and profile data server-side (always re-reads session)
  const userResult = await getCurrentUser();

  if (!userResult.success || !userResult.data.user) {
    redirect('/login');
  }

  const { user, profile } = userResult.data;

  // Check if user has profile (only professionals with completed onboarding)
  const hasProfile =
    !!(user?.role === 'freelancer' || user?.role === 'company') &&
    user?.step === 'DASHBOARD';

  if (!hasProfile) {
    redirect('/dashboard');
  }

  // Prepare taxonomy data server-side to prevent client-side bundle bloat
  const proTaxonomies = getProTaxonomies();
  const skillsDataset = getSkills();

  // Fetch user's pending skills
  const pendingResult = await getUserTaxonomySubmissions('skill');
  const pendingSkills = pendingResult.success ? pendingResult.data ?? [] : [];

  return (
    <div className='space-y-6'>
      <div>
        <h1 className='text-2xl font-bold'>Βασικά στοιχεία</h1>
        <p className='text-muted-foreground'>
          Επεξεργαστείτε τα βασικά στοιχεία του προφίλ σας
        </p>
      </div>
      <BasicInfoForm
        initialUser={user}
        initialProfile={profile}
        proTaxonomies={proTaxonomies as DatasetOption[]}
        skillsDataset={skillsDataset as DatasetWithCategory[]}
        pendingSkills={pendingSkills}
      />
      {/* Portfolio Form - Media Upload */}
      <PortfolioForm
        initialUser={user}
        initialProfile={profile}
        showHeading={false}
      />
    </div>
  );
}
