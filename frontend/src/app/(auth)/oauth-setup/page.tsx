import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/actions/auth/server';
import { getOAuthSetupMetadata } from '@/lib/seo/pages';
import OAuthSetupForm from '@/components/forms/auth/form-oauth-setup';
import { OAuthSetupGuard } from '@/components/guards';

export const dynamic = 'force-dynamic';

// Static SEO
export async function generateMetadata(): Promise<Metadata> {
  return getOAuthSetupMetadata();
}

export default async function OAuthSetupPage() {
  // Get current user (always re-reads the session — no caching applied)
  const userResult = await getCurrentUser();

  // Redirect if user is not authenticated
  if (!userResult.success || !userResult.data || !userResult.data.user) {
    redirect('/login');
  }

  const user = userResult.data.user;

  // Read type, role, and step from database - stored during OAuth user creation
  // This is secure and cannot be manipulated via URL params
  const userType = user.type || 'user';
  const userRole = user.role;
  const userStep = user.step || 'OAUTH_SETUP';

  // Show type selection UI when user is in TYPE_SELECTION step
  const showTypeSelection = userStep === 'TYPE_SELECTION';

  return (
    <section className='mt-20 pt-20 pb-40 bg-gray-50'>
      <OAuthSetupGuard user={user}>
        <div className='container mx-auto px-4'>
          {/* Title Section */}
          <div className='flex justify-center mb-15'>
            <div className='lg:w-1/2 text-center'>
              <div className='relative mb-15 lg:mb-8'>
                <h2 className='text-2xl lg:text-3xl font-medium text-gray-900 mb-2'>
                  {showTypeSelection
                    ? 'Επιλογή Τύπου Λογαριασμού'
                    : 'Ολοκλήρωση Εγγραφής με Google'}
                </h2>
                <p className='text-gray-700 font-sans'>
                  {showTypeSelection
                    ? `Καλώς ήρθατε! Παρακαλώ επιλέξτε τον τύπο του λογαριασμού σας.`
                    : <>
                        Συνδεθήκατε επιτυχώς ως {user.email}.
                        {userType === 'pro'
                          ? ' Παρακαλώ συμπληρώστε τα στοιχεία του επαγγελματικού σας λογαριασμού.'
                          : ' Ολοκλήρωση εγγραφής...'}
                      </>
                  }
                </p>
                {/* Debug info - remove in production */}
                {process.env.NODE_ENV === 'development' && (
                  <p className='text-xs text-gray-500 mt-2'>
                    Debug: userType="{userType}", userRole="{userRole}" (from
                    database)
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Form Section */}
          <div className='flex justify-center'>
            <div className='xl:w-2/5 w-full max-w-2xl'>
              <div className='relative bg-white p-12 sm:p-8 rounded-xl shadow-lg border border-gray-300'>
                <OAuthSetupForm
                  userId={user.id}
                  userEmail={user.email}
                  userType={userType}
                  userRole={userRole}
                  showTypeSelection={showTypeSelection}
                  googleUsername={user.username}
                  googleDisplayName={user.displayName}
                />
              </div>
            </div>
          </div>
        </div>
      </OAuthSetupGuard>
    </section>
  );
}
