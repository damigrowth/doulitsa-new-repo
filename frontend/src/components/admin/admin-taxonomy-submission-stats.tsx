import { Suspense } from 'react';
import { FileCheck, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { getTaxonomySubmissionStats } from '@/actions/admin/taxonomy-submission';

async function StatsCardsContent() {
  const result = await getTaxonomySubmissionStats();

  if (!result.success || !result.data) {
    return <StatsCardsSkeleton />;
  }

  const stats = result.data;

  return (
    <>
      <Card className='flex flex-col'>
        <CardHeader className='flex flex-row items-center justify-between pb-3'>
          <CardTitle className='text-sm'>Total Submissions</CardTitle>
          <FileCheck className='h-4 w-4 text-muted-foreground' />
        </CardHeader>
        <CardContent className='flex-1 p-0'>
          <div>
            <div className='flex items-center justify-between px-6 py-2'>
              <span className='text-xs text-muted-foreground'>Pending</span>
              <span className='text-xs font-medium'>{stats.pending}</span>
            </div>
            <div className='flex items-center justify-between px-6 py-2'>
              <span className='text-xs text-muted-foreground'>Processed</span>
              <span className='text-xs font-medium'>
                {stats.approved + stats.rejected}
              </span>
            </div>
          </div>
        </CardContent>
        <CardFooter className='flex items-baseline justify-between pt-3'>
          <span className='text-sm font-medium'>Total</span>
          <span className='text-xl font-bold'>{stats.total}</span>
        </CardFooter>
      </Card>

      <Card className='flex flex-col'>
        <CardHeader className='flex flex-row items-center justify-between pb-3'>
          <CardTitle className='text-sm'>Pending Review</CardTitle>
          <AlertCircle className='h-4 w-4 text-yellow-500' />
        </CardHeader>
        <CardContent className='flex-1 p-0'>
          <div>
            <div className='flex items-center justify-between px-6 py-2'>
              <span className='text-xs text-muted-foreground'>% of Total</span>
              <span className='text-xs font-medium'>
                {stats.total > 0
                  ? ((stats.pending / stats.total) * 100).toFixed(0)
                  : 0}
                %
              </span>
            </div>
            <div className='flex items-center justify-between px-6 py-2'>
              <span className='text-xs text-muted-foreground'>Awaiting Action</span>
              <span className='text-xs font-medium'>{stats.pending || 0}</span>
            </div>
          </div>
        </CardContent>
        <CardFooter className='flex items-baseline justify-between pt-3'>
          <span className='text-sm font-medium'>Pending</span>
          <span className='text-xl font-bold text-yellow-600'>
            {stats.pending}
          </span>
        </CardFooter>
      </Card>

      <Card className='flex flex-col'>
        <CardHeader className='flex flex-row items-center justify-between pb-3'>
          <CardTitle className='text-sm'>Approved</CardTitle>
          <CheckCircle2 className='h-4 w-4 text-green-500' />
        </CardHeader>
        <CardContent className='flex-1 p-0'>
          <div>
            <div className='flex items-center justify-between px-6 py-2'>
              <span className='text-xs text-muted-foreground'>% of Total</span>
              <span className='text-xs font-medium'>
                {stats.total > 0
                  ? ((stats.approved / stats.total) * 100).toFixed(0)
                  : 0}
                %
              </span>
            </div>
            <div className='flex items-center justify-between px-6 py-2'>
              <span className='text-xs text-muted-foreground'>Success Rate</span>
              <span className='text-xs font-medium'>
                {stats.approved + stats.rejected > 0
                  ? ((stats.approved / (stats.approved + stats.rejected)) * 100).toFixed(0)
                  : 0}
                %
              </span>
            </div>
          </div>
        </CardContent>
        <CardFooter className='flex items-baseline justify-between pt-3'>
          <span className='text-sm font-medium'>Approved</span>
          <span className='text-xl font-bold text-green-600'>
            {stats.approved}
          </span>
        </CardFooter>
      </Card>

      <Card className='flex flex-col'>
        <CardHeader className='flex flex-row items-center justify-between pb-3'>
          <CardTitle className='text-sm'>Rejected</CardTitle>
          <XCircle className='h-4 w-4 text-red-500' />
        </CardHeader>
        <CardContent className='flex-1 p-0'>
          <div>
            <div className='flex items-center justify-between px-6 py-2'>
              <span className='text-xs text-muted-foreground'>% of Total</span>
              <span className='text-xs font-medium'>
                {stats.total > 0
                  ? ((stats.rejected / stats.total) * 100).toFixed(0)
                  : 0}
                %
              </span>
            </div>
            <div className='flex items-center justify-between px-6 py-2'>
              <span className='text-xs text-muted-foreground'>Declined</span>
              <span className='text-xs font-medium'>{stats.rejected || 0}</span>
            </div>
          </div>
        </CardContent>
        <CardFooter className='flex items-baseline justify-between pt-3'>
          <span className='text-sm font-medium'>Rejected</span>
          <span className='text-xl font-bold text-red-600'>
            {stats.rejected}
          </span>
        </CardFooter>
      </Card>
    </>
  );
}

function StatsCardsSkeleton() {
  return (
    <>
      {/* Total Submissions Skeleton */}
      <Card className='flex flex-col'>
        <CardHeader className='flex flex-row items-center justify-between pb-3'>
          <CardTitle className='text-sm'>Total Submissions</CardTitle>
          <FileCheck className='h-4 w-4 text-muted-foreground' />
        </CardHeader>
        <CardContent className='flex-1 p-0'>
          <div>
            <div className='flex items-center justify-between px-6 py-2'>
              <span className='text-xs text-muted-foreground'>Pending</span>
              <Skeleton className='h-3 w-8' />
            </div>
            <div className='flex items-center justify-between px-6 py-2'>
              <span className='text-xs text-muted-foreground'>Processed</span>
              <Skeleton className='h-3 w-8' />
            </div>
          </div>
        </CardContent>
        <CardFooter className='flex items-baseline justify-between pt-3'>
          <Skeleton className='h-4 w-12' />
          <Skeleton className='h-6 w-12' />
        </CardFooter>
      </Card>

      {/* Pending Skeleton */}
      <Card className='flex flex-col'>
        <CardHeader className='flex flex-row items-center justify-between pb-3'>
          <CardTitle className='text-sm'>Pending Review</CardTitle>
          <AlertCircle className='h-4 w-4 text-yellow-500' />
        </CardHeader>
        <CardContent className='flex-1 p-0'>
          <div>
            <div className='flex items-center justify-between px-6 py-2'>
              <span className='text-xs text-muted-foreground'>% of Total</span>
              <Skeleton className='h-3 w-8' />
            </div>
            <div className='flex items-center justify-between px-6 py-2'>
              <span className='text-xs text-muted-foreground'>Awaiting Action</span>
              <Skeleton className='h-3 w-8' />
            </div>
          </div>
        </CardContent>
        <CardFooter className='flex items-baseline justify-between pt-3'>
          <Skeleton className='h-4 w-16' />
          <Skeleton className='h-6 w-12' />
        </CardFooter>
      </Card>

      {/* Approved Skeleton */}
      <Card className='flex flex-col'>
        <CardHeader className='flex flex-row items-center justify-between pb-3'>
          <CardTitle className='text-sm'>Approved</CardTitle>
          <CheckCircle2 className='h-4 w-4 text-green-500' />
        </CardHeader>
        <CardContent className='flex-1 p-0'>
          <div>
            <div className='flex items-center justify-between px-6 py-2'>
              <span className='text-xs text-muted-foreground'>% of Total</span>
              <Skeleton className='h-3 w-8' />
            </div>
            <div className='flex items-center justify-between px-6 py-2'>
              <span className='text-xs text-muted-foreground'>Success Rate</span>
              <Skeleton className='h-3 w-8' />
            </div>
          </div>
        </CardContent>
        <CardFooter className='flex items-baseline justify-between pt-3'>
          <Skeleton className='h-4 w-16' />
          <Skeleton className='h-6 w-12' />
        </CardFooter>
      </Card>

      {/* Rejected Skeleton */}
      <Card className='flex flex-col'>
        <CardHeader className='flex flex-row items-center justify-between pb-3'>
          <CardTitle className='text-sm'>Rejected</CardTitle>
          <XCircle className='h-4 w-4 text-red-500' />
        </CardHeader>
        <CardContent className='flex-1 p-0'>
          <div>
            <div className='flex items-center justify-between px-6 py-2'>
              <span className='text-xs text-muted-foreground'>% of Total</span>
              <Skeleton className='h-3 w-8' />
            </div>
            <div className='flex items-center justify-between px-6 py-2'>
              <span className='text-xs text-muted-foreground'>Declined</span>
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

export function AdminTaxonomySubmissionStats() {
  return (
    <Suspense fallback={<StatsCardsSkeleton />}>
      <StatsCardsContent />
    </Suspense>
  );
}
