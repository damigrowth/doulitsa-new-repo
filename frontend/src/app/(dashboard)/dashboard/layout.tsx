import { requireOnboardingComplete } from '@/actions/auth/server';
import { DashboardLayout } from '@/components/dashboard';
import { Toaster } from '@/components/ui/sonner';
import { SubscriptionSheet } from '@/components/subscription';

// Dashboard requires auth and user-specific data, so it should be dynamic.
export const dynamic = 'force-dynamic';

export default async function layout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Server-side auth check - require authentication and completed onboarding
  // This protects all dashboard routes at the layout level
  await requireOnboardingComplete();

  return (
    <>
      <DashboardLayout>{children}</DashboardLayout>
      <SubscriptionSheet />
      <Toaster />
    </>
  );
}
