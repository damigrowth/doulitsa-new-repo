import { redirect } from 'next/navigation';
import { getOnboardingMetadata } from '@/lib/seo/pages';
import { getCurrentUser } from '@/actions/auth/server';
import { OnboardingForm } from '@/components';
import { OnboardingGuard } from '@/components/guards/onboarding-guard';
import { getProTaxonomies, getLocations } from '@/lib/taxonomies';
import type { DatasetOption } from '@/lib/types/datasets';

export const dynamic = 'force-dynamic';

// Static SEO
export async function generateMetadata() {
  return getOnboardingMetadata();
}

export default async function page() {
  const userResult = await getCurrentUser();

  // Redirect if user is not authenticated
  if (!userResult.success || !userResult.data || !userResult.data.user) {
    redirect('/login');
  }

  const { user, profile } = userResult.data;

  // Prepare taxonomy and location data server-side to prevent client-side bundle bloat
  const proTaxonomies = getProTaxonomies();

  return (
    <section className='mt-20 pt-20 pb-40 bg-gray-50'>
      <OnboardingGuard user={user}>
        <div className='container mx-auto px-4'>
          {/* Title Section */}
          <div className='flex justify-center mb-15'>
            <div className='lg:w-1/2 text-center'>
              <div className='relative mb-15 lg:mb-8'>
                <h2 className='text-2xl lg:text-3xl font-medium text-gray-900 mb-2'>
                  Ολοκλήρωση Εγγραφής
                </h2>
                <p className='text-gray-700 font-sans'>
                  Αυτό θα βοηθήσει τους χρήστες να σας βρουν και να
                  επικοινωνήσουν μαζί σας.
                </p>
              </div>
            </div>
          </div>
          {/* Form Section */}
          <div className='flex justify-center'>
            <div className='xl:w-3/5 w-full max-w-3xl'>
              <div className='relative bg-white p-4 sm:p-8 lg:p-12 rounded-xl shadow-lg border border-gray-300'>
                <OnboardingForm
                  user={user}
                  profile={profile}
                  proTaxonomies={proTaxonomies as DatasetOption[]}
                  locationOptions={getLocations()}
                />
              </div>
            </div>
          </div>
        </div>
      </OnboardingGuard>
    </section>
  );
}
