import { SiteHeader } from '@/components/admin/site-header';
import { requireEditPermission } from '@/actions/auth/server';
import { ADMIN_RESOURCES } from '@/lib/auth/roles';
import { ManualSubscriptionForm } from '@/components/admin/subscriptions/manual-subscription-form';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Νέα Συνδρομή | Admin',
  description: 'Δημιουργήστε μια νέα συνδρομή για ένα επαγγελματικό προφίλ',
};

export default async function AdminCreateManualSubscriptionPage() {
  await requireEditPermission(ADMIN_RESOURCES.SUBSCRIPTIONS, '/admin/subscriptions');

  return (
    <>
      <SiteHeader title='Νέα Συνδρομή' />
      <div className='flex flex-col gap-4 pb-6 pt-4 md:gap-6'>
        <div className='px-4 lg:px-6'>
          <ManualSubscriptionForm />
        </div>
      </div>
    </>
  );
}
