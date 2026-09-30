import CoverageForm from '@/components/forms/profile/form-coverage';
import { getCurrentUser, requireProUser } from '@/actions/auth/server';
import { redirect } from 'next/navigation';
import { getDashboardMetadata } from '@/lib/seo/pages';
import { getLocations } from '@/lib/taxonomies';
import type { DatasetItem } from '@/lib/types/datasets';

export const metadata = getDashboardMetadata('Τρόποι Παροχής');

export default async function CoveragePage() {
  // Require pro user type - redirects if type !== 'pro'
  await requireProUser();

  // Fetch current user and profile data server-side (always re-reads session)
  const userResult = await getCurrentUser();

  if (!userResult.success || !userResult.data.user) {
    redirect('/login');
  }

  const { user, profile } = userResult.data;

  // Only professionals who finished onboarding have a profile to manage
  const hasProfile =
    !!(user?.role === 'freelancer' || user?.role === 'company') &&
    user?.step === 'DASHBOARD';

  if (!hasProfile) {
    redirect('/dashboard');
  }

  return (
    <div className='space-y-6'>
      <div>
        <h1 className='text-2xl font-bold'>Τρόποι Παροχής Υπηρεσιών</h1>
        <p className='text-muted-foreground'>
          Διαχειριστείτε τους τρόπους παροχής των υπηρεσιών σας
        </p>
      </div>

      <CoverageForm
        initialUser={user}
        initialProfile={profile}
        locationOptions={getLocations() as DatasetItem[]}
      />
    </div>
  );
}
