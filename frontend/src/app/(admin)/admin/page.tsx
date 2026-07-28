import { AdminStatsCards } from '@/components/admin/admin-stats-cards';
import { AdminNavCards } from '@/components/admin/admin-nav-cards';
import { SiteHeader } from '@/components/admin/site-header';
import { getServiceStats } from '@/actions/admin/services';
import { getProfileStats } from '@/actions/admin/profiles';
import { getUserStats } from '@/actions/admin/users';
import { getTaxonomySubmissionStats } from '@/actions/admin/taxonomy-submission';
import { hasPermission } from '@/actions/auth/server';
import { ADMIN_RESOURCES } from '@/lib/auth/roles';

// Force dynamic rendering for admin pages
export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
  // Check permissions first to avoid redirect errors
  const [canViewServices, canViewProfiles, canViewUsers, canViewTaxonomies] =
    await Promise.all([
      hasPermission(ADMIN_RESOURCES.SERVICES),
      hasPermission(ADMIN_RESOURCES.PROFILES),
      hasPermission(ADMIN_RESOURCES.USERS),
      hasPermission(ADMIN_RESOURCES.TAXONOMIES),
    ]);

  // Only fetch stats for resources user can access
  const [servicesResult, profilesResult, usersResult, submissionsResult] =
    await Promise.all([
      canViewServices
        ? getServiceStats()
        : Promise.resolve({ success: false, data: null }),
      canViewProfiles
        ? getProfileStats()
        : Promise.resolve({ success: false, data: null }),
      canViewUsers
        ? getUserStats()
        : Promise.resolve({ success: false, data: null }),
      canViewTaxonomies
        ? getTaxonomySubmissionStats()
        : Promise.resolve({ success: false, data: null }),
    ]);

  // Extract data from results
  const serviceStats =
    servicesResult.success && servicesResult.data
      ? {
          total: servicesResult.data.total,
          published: servicesResult.data.published,
          pending: servicesResult.data.pending,
        }
      : null;

  const profileStats =
    profilesResult.success && profilesResult.data
      ? {
          total: profilesResult.data.total,
          verified: profilesResult.data.verified,
          unverified: profilesResult.data.unverified || 0,
        }
      : null;

  const userStats =
    usersResult.success && usersResult.data
      ? {
          total: usersResult.data.total,
          byType: {
            // Backend `byType` is keyed by UserType values ("user"/"pro");
            // the simple-user bucket lives under "user".
            user: usersResult.data.byType.user,
            pro: usersResult.data.byType.pro,
          },
        }
      : null;

  const submissionStats =
    submissionsResult.success && submissionsResult.data
      ? {
          total: submissionsResult.data.total,
          pending: submissionsResult.data.pending,
          approved: submissionsResult.data.approved,
          rejected: submissionsResult.data.rejected,
        }
      : null;

  return (
    <>
      <SiteHeader title='Dashboard' />
      <div className='flex flex-col gap-6 py-4'>
        <AdminStatsCards
          serviceStats={serviceStats}
          profileStats={profileStats}
          userStats={userStats}
          submissionStats={submissionStats}
        />
        <AdminNavCards />
      </div>
    </>
  );
}
