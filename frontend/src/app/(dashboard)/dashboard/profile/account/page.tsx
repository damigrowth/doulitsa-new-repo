import { getCurrentUser } from '@/actions/auth/server';
import { AccountForm, AccountPageActions } from '@/components';
import { redirect } from 'next/navigation';
import { getDashboardMetadata } from '@/lib/seo/pages';

export const metadata = getDashboardMetadata('Λογαριασμός');

export default async function AccountPage() {
  // Fetch current user data server-side (always re-reads the session)
  const userResult = await getCurrentUser();

  if (!userResult.success || !userResult.data.user) {
    redirect('/login');
  }

  const { user, profile } = userResult.data;

  return (
    <div className='space-y-6'>
      <div>
        <h1 className='text-2xl font-bold'>Λογαριασμός</h1>
        <p className='text-muted-foreground'>
          Διαχείριση ρυθμίσεων λογαριασμού
        </p>
      </div>

      <AccountForm initialUser={user} />

      {/* Account Actions */}
      <AccountPageActions user={user} />
    </div>
  );
}
