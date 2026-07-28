import { SiteHeader } from '@/components/admin/site-header';
import { AdminUsersStats } from '@/components/admin/admin-users-stats';
import { AdminProfilesStats } from '@/components/admin/admin-profiles-stats';
import { AdminServicesStats } from '@/components/admin/admin-services-stats';
import { AdminBrevoStats } from '@/components/admin/admin-brevo-stats';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { requirePermission } from '@/actions/auth/server';
import { ADMIN_RESOURCES } from '@/lib/auth/roles';

// Force dynamic rendering for admin pages
export const dynamic = 'force-dynamic';

export default async function AnalyticsPage() {
  // Require admin-only access
  await requirePermission(ADMIN_RESOURCES.ANALYTICS);
  return (
    <>
      <SiteHeader title='Analytics' />
      <div className='flex flex-col gap-4 pb-6 pt-4 md:gap-6'>
        <div className='px-4 lg:px-6'>
          <Tabs defaultValue='overview' className='space-y-4'>
            <TabsList>
              <TabsTrigger value='overview'>Overview</TabsTrigger>
              <TabsTrigger value='users'>Users</TabsTrigger>
              <TabsTrigger value='profiles'>Profiles</TabsTrigger>
              <TabsTrigger value='services'>Services</TabsTrigger>
            </TabsList>

            <TabsContent value='overview' className='space-y-4'>
              <div className='space-y-6'>
                {/* Users Stats */}
                <div>
                  <h3 className='mb-4 text-lg font-semibold'>Users</h3>
                  <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
                    <AdminUsersStats />
                  </div>
                </div>

                {/* Profiles Stats */}
                <div>
                  <h3 className='mb-4 text-lg font-semibold'>Profiles</h3>
                  <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
                    <AdminProfilesStats />
                    <AdminBrevoStats />
                  </div>
                </div>

                {/* Services Stats */}
                <div>
                  <h3 className='mb-4 text-lg font-semibold'>Services</h3>
                  <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
                    <AdminServicesStats />
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value='users' className='space-y-4'>
              <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
                <AdminUsersStats />
              </div>
            </TabsContent>

            <TabsContent value='profiles' className='space-y-4'>
              <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
                <AdminProfilesStats />
                <AdminBrevoStats />
              </div>
            </TabsContent>

            <TabsContent value='services' className='space-y-4'>
              <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
                <AdminServicesStats />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  );
}
