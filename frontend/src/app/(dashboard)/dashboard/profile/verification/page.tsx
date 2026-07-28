import { VerificationForm } from '@/components';
import { VerificationStatus } from '@/components';
import { getVerificationStatus } from '@/actions/profiles/verification';
import { getCurrentUser, requireProUser } from '@/actions/auth/server';
import { redirect } from 'next/navigation';
import { getDashboardMetadata } from '@/lib/seo/pages';

export const metadata = getDashboardMetadata('Πιστοποίηση');

export default async function VerificationPage() {
  // Require pro user type - redirects if type !== 'pro'
  await requireProUser();

  // Fetch current user and profile data server-side
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

  // Fetch verification data server-side
  const verificationResult = await getVerificationStatus();
  const verificationData = verificationResult.success
    ? verificationResult.data
    : null;

  return (
    <div className='space-y-6'>
      <VerificationStatus verificationData={verificationData} />
      <VerificationForm initialUser={user} initialProfile={profile} verificationData={verificationData} />
    </div>
  );
}
