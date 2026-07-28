import { getCurrentUser, requireProUser } from '@/actions/auth/server';
import { PresentationInfoForm } from '@/components';
import { redirect } from 'next/navigation';
import { getDashboardMetadata } from '@/lib/seo/pages';

export const metadata = getDashboardMetadata('Επικοινωνία');

export default async function ContactDetailsPage() {
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

  return (
    <div className='space-y-6'>
      <div>
        <h1 className='text-2xl font-bold'>Επικοινωνία</h1>
        <p className='text-muted-foreground'>
          Διαχειριστείτε τα στοιχεία επικοινωνίας του προφίλ σας
        </p>
      </div>
      {/* Presentation Info Form - Phone, Website, Visibility, Socials */}
      <PresentationInfoForm initialUser={user} initialProfile={profile} />
    </div>
  );
}
