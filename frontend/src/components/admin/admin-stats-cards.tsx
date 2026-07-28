import {
  BriefcaseIcon,
  CheckCircleIcon,
  FileTextIcon,
  UsersIcon,
} from 'lucide-react';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

interface ServiceStats {
  total: number;
  published: number;
  pending: number;
}

interface ProfileStats {
  total: number;
  verified: number;
  unverified: number;
}

interface UserStats {
  total: number;
  byType: {
    user: number;
    pro: number;
  };
}

interface SubmissionStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
}

interface AdminStatsCardsProps {
  serviceStats: ServiceStats | null;
  profileStats: ProfileStats | null;
  userStats: UserStats | null;
  submissionStats?: SubmissionStats | null;
}

export function AdminStatsCards({
  serviceStats,
  profileStats,
  userStats,
  submissionStats,
}: AdminStatsCardsProps) {
  return (
    <div className='grid gap-4 px-4 md:grid-cols-2 lg:grid-cols-4 lg:px-6'>
      {/* Services Card */}
      {serviceStats && (
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>
              Total Services
            </CardTitle>
            <BriefcaseIcon className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>{serviceStats.total}</div>
            <div className='mt-4 space-y-1 text-xs text-muted-foreground'>
              <div className='flex items-center justify-between'>
                <span>Published</span>
                <span className='font-medium text-foreground'>
                  {serviceStats.published}
                </span>
              </div>
              <div className='flex items-center justify-between'>
                <span>Pending</span>
                <span className='font-medium text-foreground'>
                  {serviceStats.pending}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Verifications Card */}
      {profileStats && (
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>
              Verifications
            </CardTitle>
            <CheckCircleIcon className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>{profileStats.total}</div>
            <div className='mt-4 space-y-1 text-xs text-muted-foreground'>
              <div className='flex items-center justify-between'>
                <span>Verified</span>
                <span className='font-medium text-foreground'>
                  {profileStats.verified}
                </span>
              </div>
              <div className='flex items-center justify-between'>
                <span>Pending</span>
                <span className='font-medium text-foreground'>
                  {profileStats.unverified}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Users Card */}
      {userStats && (
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Total Users</CardTitle>
            <UsersIcon className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>{userStats.total}</div>
            <div className='mt-4 space-y-1 text-xs text-muted-foreground'>
              <div className='flex items-center justify-between'>
                <span>User</span>
                <span className='font-medium text-foreground'>
                  {userStats.byType?.user ?? 0}
                </span>
              </div>
              <div className='flex items-center justify-between'>
                <span>Pro</span>
                <span className='font-medium text-foreground'>
                  {userStats.byType?.pro ?? 0}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Submissions Card */}
      {submissionStats && (
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>
              Total Submissions
            </CardTitle>
            <FileTextIcon className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>{submissionStats.total}</div>
            <div className='mt-4 space-y-1 text-xs text-muted-foreground'>
              <div className='flex items-center justify-between'>
                <span>Pending</span>
                <span className='font-medium text-foreground'>
                  {submissionStats.pending}
                </span>
              </div>
              <div className='flex items-center justify-between'>
                <span>Approved</span>
                <span className='font-medium text-foreground'>
                  {submissionStats.approved}
                </span>
              </div>
              <div className='flex items-center justify-between'>
                <span>Rejected</span>
                <span className='font-medium text-foreground'>
                  {submissionStats.rejected}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
