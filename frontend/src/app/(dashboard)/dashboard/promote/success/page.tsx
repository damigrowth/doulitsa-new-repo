import { requireProUser } from '@/actions/auth/server';
import { getSubscription, syncSubscriptionBilling } from '@/actions/subscription';
import { SubscriptionStatus, type Subscription } from '@/lib/prisma-types';
import { getDashboardMetadata } from '@/lib/seo/pages';
import SuccessContent from './success-content';

export const metadata = getDashboardMetadata('Επιτυχής Εγγραφή');
export const dynamic = 'force-dynamic';

export default async function SubscriptionSuccessPage() {
  await requireProUser();

  // Sync billing from profile to subscription (fallback for when webhook didn't fire)
  await syncSubscriptionBilling();

  const subResult = await getSubscription();
  const subscription: Subscription | null = subResult.success
    ? ((subResult.data?.subscription as Subscription | null) ?? null)
    : null;
  const isActive = subscription?.status === SubscriptionStatus.active;

  return <SuccessContent initialIsActive={isActive} />;
}
