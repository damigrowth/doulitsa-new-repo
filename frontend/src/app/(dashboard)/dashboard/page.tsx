import DashboardContent from '@/components/dashboard/dashboard-content';
import { getDashboardMetadata } from '@/lib/seo/pages';

export const metadata = getDashboardMetadata('Πίνακας Ελέγχου');

export const dynamic = 'force-dynamic';

export const revalidate = 60; // 1 minute — short window so DB changes show up fast

export default async function DashboardPage() {
  // Authentication and onboarding check handled at layout level
  return <DashboardContent />;
}
