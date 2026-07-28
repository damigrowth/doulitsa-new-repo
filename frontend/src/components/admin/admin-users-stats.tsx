import { Suspense } from 'react';
import { Users, UserCheck, Route, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { getUserStats } from '@/actions/admin/users';

async function StatsCardsContent() {
  const statsResult = await getUserStats();
  const stats = statsResult.success ? statsResult.data : null;

  const totalUsers = stats?.total || 0;
  const simpleUsers = stats?.byType.user || 0;
  const proUsers = stats?.byType.pro || 0;
  const emailProvider = stats?.byProvider.email || 0;
  const googleProvider = stats?.byProvider.google || 0;
  const emailVerificationStep = stats?.byStep.EMAIL_VERIFICATION || 0;
  const oauthSetupStep = stats?.byStep.OAUTH_SETUP || 0;
  const onboardingStep = stats?.byStep.ONBOARDING || 0;
  const dashboardStep = stats?.byStep.DASHBOARD || 0;
  const verified = (stats?.total || 0) - (stats?.unverified || 0);
  const unverified = stats?.unverified || 0;
  const banned = stats?.banned || 0;
  const blocked = stats?.blocked || 0;

  return (
    <>
      {/* Total Users Card */}
      <Card className='flex flex-col'>
        <CardHeader className='flex flex-row items-center justify-between pb-3'>
          <CardTitle className='text-sm'>Total Users</CardTitle>
          <Users className='h-4 w-4 text-green-500' />
        </CardHeader>
        <CardContent className='flex-1 p-0'>
          <div>
            <div className='flex items-center justify-between px-6 py-2'>
              <span className='text-xs text-muted-foreground'>User</span>
              <span className='text-xs font-medium'>{simpleUsers}</span>
            </div>
            <div className='flex items-center justify-between px-6 py-2'>
              <span className='text-xs text-muted-foreground'>Pro</span>
              <span className='text-xs font-medium'>{proUsers}</span>
            </div>
          </div>
        </CardContent>
        <CardFooter className='flex items-baseline justify-between pt-3'>
          <span className='text-sm font-medium'>Total</span>
          <span className='text-xl font-bold'>{totalUsers}</span>
        </CardFooter>
      </Card>

      {/* Auth Providers Card */}
      <Card className='flex flex-col'>
        <CardHeader className='flex flex-row items-center justify-between pb-3'>
          <CardTitle className='text-sm'>Auth Providers</CardTitle>
          <UserCheck className='h-4 w-4 text-blue-500' />
        </CardHeader>
        <CardContent className='flex-1 p-0'>
          <div>
            <div className='flex items-center justify-between px-6 py-2'>
              <span className='text-xs text-muted-foreground'>Email</span>
              <span className='text-xs font-medium'>{emailProvider}</span>
            </div>
            <div className='flex items-center justify-between px-6 py-2'>
              <span className='text-xs text-muted-foreground'>Google</span>
              <span className='text-xs font-medium'>{googleProvider}</span>
            </div>
          </div>
        </CardContent>
        <CardFooter className='flex items-baseline justify-between pt-3'>
          <span className='text-sm font-medium'>
            {emailProvider > googleProvider ? 'Email' : 'Google'}
          </span>
          <span className='text-xl font-bold'>{Math.max(emailProvider, googleProvider)}</span>
        </CardFooter>
      </Card>

      {/* User Steps Card */}
      <Card className='flex flex-col'>
        <CardHeader className='flex flex-row items-center justify-between pb-3'>
          <CardTitle className='text-sm'>Steps</CardTitle>
          <Route className='h-4 w-4 text-purple-500' />
        </CardHeader>
        <CardContent className='flex-1 p-0'>
          <div>
            <div className='flex items-center justify-between px-6 py-2'>
              <span className='text-xs text-muted-foreground'>Email Confirmation</span>
              <span className='text-xs font-medium'>{emailVerificationStep}</span>
            </div>
            <div className='flex items-center justify-between px-6 py-2'>
              <span className='text-xs text-muted-foreground'>OAuth</span>
              <span className='text-xs font-medium'>{oauthSetupStep}</span>
            </div>
            <div className='flex items-center justify-between px-6 py-2'>
              <span className='text-xs text-muted-foreground'>Onboarding</span>
              <span className='text-xs font-medium'>{onboardingStep}</span>
            </div>
            <div className='flex items-center justify-between px-6 py-2'>
              <span className='text-xs text-muted-foreground'>Dashboard</span>
              <span className='text-xs font-medium'>{dashboardStep}</span>
            </div>
          </div>
        </CardContent>
        <CardFooter className='flex items-baseline justify-between pt-3'>
          <span className='text-sm font-medium'>Onboarding</span>
          <span className='text-xl font-bold'>{onboardingStep}</span>
        </CardFooter>
      </Card>

      {/* Status Card */}
      <Card className='flex flex-col'>
        <CardHeader className='flex flex-row items-center justify-between pb-3'>
          <CardTitle className='text-sm'>Status</CardTitle>
          <AlertCircle className='h-4 w-4 text-orange-500' />
        </CardHeader>
        <CardContent className='flex-1 p-0'>
          <div>
            <div className='flex items-center justify-between px-6 py-2'>
              <span className='text-xs text-muted-foreground'>Confirmed</span>
              <span className='text-xs font-medium'>{verified}</span>
            </div>
            <div className='flex items-center justify-between px-6 py-2'>
              <span className='text-xs text-muted-foreground'>Not Confirmed</span>
              <span className='text-xs font-medium'>{unverified}</span>
            </div>
            <div className='flex items-center justify-between px-6 py-2'>
              <span className='text-xs text-muted-foreground'>Banned</span>
              <span className='text-xs font-medium'>{banned}</span>
            </div>
            <div className='flex items-center justify-between px-6 py-2'>
              <span className='text-xs text-muted-foreground'>Blocked</span>
              <span className='text-xs font-medium'>{blocked}</span>
            </div>
          </div>
        </CardContent>
        <CardFooter className='flex items-baseline justify-between pt-3'>
          <span className='text-sm font-medium'>Not Confirmed</span>
          <span className='text-xl font-bold'>{unverified}</span>
        </CardFooter>
      </Card>
    </>
  );
}

function StatsCardsSkeleton() {
  return (
    <>
      {/* Total Users Skeleton */}
      <Card className='flex flex-col'>
        <CardHeader className='flex flex-row items-center justify-between pb-3'>
          <CardTitle className='text-sm'>Total Users</CardTitle>
          <Users className='h-4 w-4 text-green-500' />
        </CardHeader>
        <CardContent className='flex-1 p-0'>
          <div>
            <div className='flex items-center justify-between px-6 py-2'>
              <span className='text-xs text-muted-foreground'>User</span>
              <Skeleton className='h-3 w-8' />
            </div>
            <div className='flex items-center justify-between px-6 py-2'>
              <span className='text-xs text-muted-foreground'>Pro</span>
              <Skeleton className='h-3 w-8' />
            </div>
          </div>
        </CardContent>
        <CardFooter className='flex items-baseline justify-between pt-3'>
          <Skeleton className='h-4 w-16' />
          <Skeleton className='h-6 w-12' />
        </CardFooter>
      </Card>

      {/* Auth Providers Skeleton */}
      <Card className='flex flex-col'>
        <CardHeader className='flex flex-row items-center justify-between pb-3'>
          <CardTitle className='text-sm'>Auth Providers</CardTitle>
          <UserCheck className='h-4 w-4 text-blue-500' />
        </CardHeader>
        <CardContent className='flex-1 p-0'>
          <div>
            <div className='flex items-center justify-between px-6 py-2'>
              <span className='text-xs text-muted-foreground'>Email</span>
              <Skeleton className='h-3 w-8' />
            </div>
            <div className='flex items-center justify-between px-6 py-2'>
              <span className='text-xs text-muted-foreground'>Google</span>
              <Skeleton className='h-3 w-8' />
            </div>
          </div>
        </CardContent>
        <CardFooter className='flex items-baseline justify-between pt-3'>
          <Skeleton className='h-4 w-16' />
          <Skeleton className='h-6 w-12' />
        </CardFooter>
      </Card>

      {/* User Steps Skeleton */}
      <Card className='flex flex-col'>
        <CardHeader className='flex flex-row items-center justify-between pb-3'>
          <CardTitle className='text-sm'>Steps</CardTitle>
          <Route className='h-4 w-4 text-purple-500' />
        </CardHeader>
        <CardContent className='flex-1 p-0'>
          <div>
            <div className='flex items-center justify-between px-6 py-2'>
              <span className='text-xs text-muted-foreground'>Email Confirmation</span>
              <Skeleton className='h-3 w-8' />
            </div>
            <div className='flex items-center justify-between px-6 py-2'>
              <span className='text-xs text-muted-foreground'>OAuth</span>
              <Skeleton className='h-3 w-8' />
            </div>
            <div className='flex items-center justify-between px-6 py-2'>
              <span className='text-xs text-muted-foreground'>Onboarding</span>
              <Skeleton className='h-3 w-8' />
            </div>
            <div className='flex items-center justify-between px-6 py-2'>
              <span className='text-xs text-muted-foreground'>Dashboard</span>
              <Skeleton className='h-3 w-8' />
            </div>
          </div>
        </CardContent>
        <CardFooter className='flex items-baseline justify-between pt-3'>
          <Skeleton className='h-4 w-16' />
          <Skeleton className='h-6 w-12' />
        </CardFooter>
      </Card>

      {/* Status Skeleton */}
      <Card className='flex flex-col'>
        <CardHeader className='flex flex-row items-center justify-between pb-3'>
          <CardTitle className='text-sm'>Status</CardTitle>
          <AlertCircle className='h-4 w-4 text-orange-500' />
        </CardHeader>
        <CardContent className='flex-1 p-0'>
          <div>
            <div className='flex items-center justify-between px-6 py-2'>
              <span className='text-xs text-muted-foreground'>Confirmed</span>
              <Skeleton className='h-3 w-8' />
            </div>
            <div className='flex items-center justify-between px-6 py-2'>
              <span className='text-xs text-muted-foreground'>Not Confirmed</span>
              <Skeleton className='h-3 w-8' />
            </div>
            <div className='flex items-center justify-between px-6 py-2'>
              <span className='text-xs text-muted-foreground'>Banned</span>
              <Skeleton className='h-3 w-8' />
            </div>
            <div className='flex items-center justify-between px-6 py-2'>
              <span className='text-xs text-muted-foreground'>Blocked</span>
              <Skeleton className='h-3 w-8' />
            </div>
          </div>
        </CardContent>
        <CardFooter className='flex items-baseline justify-between pt-3'>
          <Skeleton className='h-4 w-16' />
          <Skeleton className='h-6 w-12' />
        </CardFooter>
      </Card>
    </>
  );
}

export function AdminUsersStats() {
  return (
    <Suspense fallback={<StatsCardsSkeleton />}>
      <StatsCardsContent />
    </Suspense>
  );
}
