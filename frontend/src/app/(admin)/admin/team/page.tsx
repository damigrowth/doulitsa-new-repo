import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SiteHeader } from '@/components/admin/site-header';
import { getTeamMembers } from '@/actions/admin/users';
import { TeamManagementClient } from '@/components/admin/team/team-management-client';
import { TeamCardsClient } from '@/components/admin/team/team-cards-client';
import { ADMIN_ROLES } from '@/lib/auth/roles';
import { requirePermission } from '@/actions/auth/server';
import { ADMIN_RESOURCES } from '@/lib/auth/roles';

export const dynamic = 'force-dynamic';

export default async function TeamPage() {
  // Require admin-only access
  await requirePermission(ADMIN_RESOURCES.TEAM);

  // Fetch team members
  const result = await getTeamMembers();
  const teamMembers = result.success ? result.data : [];

  // Calculate stats
  const totalMembers = teamMembers.length;
  const adminCount = teamMembers.filter(
    (m) => m.role === ADMIN_ROLES.ADMIN,
  ).length;
  const supportCount = teamMembers.filter(
    (m) => m.role === ADMIN_ROLES.SUPPORT,
  ).length;
  const editorCount = teamMembers.filter(
    (m) => m.role === ADMIN_ROLES.EDITOR,
  ).length;

  return (
    <>
      <SiteHeader title='Team' actions={<TeamManagementClient />} />

      <div className='flex flex-col gap-6 py-4'>
        {/* Stats Cards */}
        <div className='px-4 lg:px-6'>
          <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
            <Card>
              <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                <CardTitle className='text-sm font-medium'>
                  Total Team Members
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className='text-2xl font-bold'>{totalMembers}</div>
                <p className='text-xs text-muted-foreground'>
                  Active administrators
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                <CardTitle className='text-sm font-medium'>Admins</CardTitle>
              </CardHeader>
              <CardContent>
                <div className='text-2xl font-bold'>{adminCount}</div>
                <p className='text-xs text-muted-foreground'>
                  Full access level
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                <CardTitle className='text-sm font-medium'>Support</CardTitle>
              </CardHeader>
              <CardContent>
                <div className='text-2xl font-bold'>{supportCount}</div>
                <p className='text-xs text-muted-foreground'>Limited access</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                <CardTitle className='text-sm font-medium'>Editors</CardTitle>
              </CardHeader>
              <CardContent>
                <div className='text-2xl font-bold'>{editorCount}</div>
                <p className='text-xs text-muted-foreground'>
                  Content management
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Team Members Grid */}
        <div className='px-4 lg:px-6'>
          {teamMembers.length === 0 ? (
            <Card>
              <CardContent className='flex flex-col items-center justify-center py-10'>
                <p className='text-muted-foreground'>No team members found</p>
                <p className='text-sm text-muted-foreground'>
                  Click "Add Team Member" to assign admin roles
                </p>
              </CardContent>
            </Card>
          ) : (
            <TeamCardsClient teamMembers={teamMembers} />
          )}
        </div>
      </div>
    </>
  );
}
