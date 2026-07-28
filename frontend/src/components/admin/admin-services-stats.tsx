import { Suspense } from 'react';
import { Layers, LayoutGrid, Star, MapPin, Euro } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { getServiceStats } from '@/actions/admin/services';

async function StatsCardsContent() {
  const statsResult = await getServiceStats();

  if (!statsResult.success || !statsResult.data) {
    return <StatsCardsSkeleton />;
  }

  const stats = statsResult.data;

  return (
    <>
      {/* 1. Total Services Card */}
      <Card className='flex flex-col'>
        <CardHeader className='flex flex-row items-center justify-between pb-3'>
          <CardTitle className='text-sm'>Total Services</CardTitle>
          <Layers className='h-4 w-4 text-blue-600' />
        </CardHeader>
        <CardContent className='flex-1 p-0'>
          <div>
            <div className='flex items-center justify-between px-6 py-2'>
              <span className='text-xs text-muted-foreground'>Published</span>
              <span className='text-xs font-medium'>{stats.published}</span>
            </div>
            <div className='flex items-center justify-between px-6 py-2'>
              <span className='text-xs text-muted-foreground'>Approved</span>
              <span className='text-xs font-medium'>{stats.approved}</span>
            </div>
            <div className='flex items-center justify-between px-6 py-2'>
              <span className='text-xs text-muted-foreground'>Pending</span>
              <span className='text-xs font-medium'>{stats.pending}</span>
            </div>
            <div className='flex items-center justify-between px-6 py-2'>
              <span className='text-xs text-muted-foreground'>Draft</span>
              <span className='text-xs font-medium'>{stats.draft}</span>
            </div>
            <div className='flex items-center justify-between px-6 py-2'>
              <span className='text-xs text-muted-foreground'>Rejected</span>
              <span className='text-xs font-medium'>{stats.rejected || 0}</span>
            </div>
            <div className='flex items-center justify-between px-6 py-2'>
              <span className='text-xs text-muted-foreground'>Inactive</span>
              <span className='text-xs font-medium'>{stats.inactive || 0}</span>
            </div>
          </div>
        </CardContent>
        <CardFooter className='flex items-baseline justify-between pt-3'>
          <span className='text-sm font-medium'>Total</span>
          <span className='text-xl font-bold'>{stats.total}</span>
        </CardFooter>
      </Card>

      {/* 2. Type Card */}
      <Card className='flex flex-col'>
        <CardHeader className='flex flex-row items-center justify-between pb-3'>
          <CardTitle className='text-sm'>Type</CardTitle>
          <MapPin className='h-4 w-4 text-red-600' />
        </CardHeader>
        <CardContent className='flex-1 p-0'>
          <div>
            <div className='flex items-center justify-between px-6 py-2'>
              <span className='text-xs text-muted-foreground'>Presence</span>
              <span className='text-xs font-medium'>{stats.serviceTypes.presence}</span>
            </div>
            <div className='flex items-center justify-between px-6 py-2'>
              <span className='text-xs text-muted-foreground flex items-center gap-1'>
                <span className='text-muted-foreground/40'>├─</span>
                On-base
              </span>
              <span className='text-xs font-medium'>{stats.serviceTypes.onbase}</span>
            </div>
            <div className='flex items-center justify-between px-6 py-2'>
              <span className='text-xs text-muted-foreground flex items-center gap-1'>
                <span className='text-muted-foreground/40'>└─</span>
                On-site
              </span>
              <span className='text-xs font-medium'>{stats.serviceTypes.onsite}</span>
            </div>
            <div className='flex items-center justify-between px-6 py-2'>
              <span className='text-xs text-muted-foreground'>Online</span>
              <span className='text-xs font-medium'>{stats.serviceTypes.online}</span>
            </div>
            <div className='flex items-center justify-between px-6 py-2'>
              <span className='text-xs text-muted-foreground flex items-center gap-1'>
                <span className='text-muted-foreground/40'>├─</span>
                One-off
              </span>
              <span className='text-xs font-medium'>{stats.serviceTypes.oneoff}</span>
            </div>
            <div className='flex items-center justify-between px-6 py-2'>
              <span className='text-xs text-muted-foreground flex items-center gap-1'>
                <span className='text-muted-foreground/40'>└─</span>
                Subscription
              </span>
              <span className='text-xs font-medium'>{stats.serviceTypes.subscription}</span>
            </div>
          </div>
        </CardContent>
        <CardFooter className='flex items-baseline justify-between pt-3'>
          {(() => {
            const parentTypes = [
              { name: 'Presence', count: stats.serviceTypes.presence },
              { name: 'Online', count: stats.serviceTypes.online },
            ];
            const topType = stats.serviceTypes.presence >= stats.serviceTypes.online
              ? parentTypes[0]
              : parentTypes[1];
            return (
              <>
                <span className='text-sm font-medium'>{topType.name}</span>
                <span className='text-xl font-bold'>{topType.count}</span>
              </>
            );
          })()}
        </CardFooter>
      </Card>

      {/* 3. Pricing Card */}
      <Card className='flex flex-col'>
        <CardHeader className='flex flex-row items-center justify-between pb-3'>
          <CardTitle className='text-sm'>Pricing</CardTitle>
          <Euro className='h-4 w-4 text-green-600' />
        </CardHeader>
        <CardContent className='flex-1 p-0'>
          <div>
            {/* Fixed */}
            <div className='flex items-center justify-between px-6 py-2'>
              <span className='text-xs text-muted-foreground'>Fixed</span>
              <span className='text-xs font-medium'>{stats.pricing?.fixed ?? 0}</span>
            </div>
            {/* Not Fixed */}
            <div className='flex items-center justify-between px-6 py-2'>
              <span className='text-xs text-muted-foreground'>Not Fixed</span>
              <span className='text-xs font-medium'>{stats.pricing?.notFixed ?? 0}</span>
            </div>
            {/* Subscription Type - Show top winner */}
            <div className='flex items-center justify-between px-6 py-2'>
              <span className='text-xs text-muted-foreground'>Subscription Type</span>
              <span className='text-xs font-medium'>
                {(() => {
                  const topSubType = Object.entries(stats.pricing?.subscriptionTypes ?? {})
                    .sort((a, b) => b[1] - a[1])[0];
                  return topSubType
                    ? topSubType[0].replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
                    : 'N/A';
                })()}
              </span>
            </div>
            {/* Average Price */}
            <div className='flex items-center justify-between px-6 py-2'>
              <span className='text-xs text-muted-foreground'>Price (Avg)</span>
              <span className='text-xs font-medium'>{stats.pricing?.averagePrice ?? 0} €</span>
            </div>
            {/* Average Duration */}
            <div className='flex items-center justify-between px-6 py-2'>
              <span className='text-xs text-muted-foreground'>Duration (Avg Days)</span>
              <span className='text-xs font-medium'>{stats.pricing?.averageDuration ?? 0}</span>
            </div>
          </div>
        </CardContent>
        <CardFooter className='flex items-baseline justify-between pt-3'>
          {(() => {
            const topSubType = Object.entries(stats.pricing?.subscriptionTypes ?? {})
              .sort((a, b) => b[1] - a[1])[0];
            const topTypeName = topSubType
              ? topSubType[0].replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
              : 'N/A';
            return (
              <>
                <span className='text-sm font-medium'>{topTypeName}</span>
                <span className='text-xl font-bold'>{topSubType ? topSubType[1] : 0}</span>
              </>
            );
          })()}
        </CardFooter>
      </Card>

      {/* 4. Status Card */}
      <Card className='flex flex-col'>
        <CardHeader className='flex flex-row items-center justify-between pb-3'>
          <CardTitle className='text-sm'>Status</CardTitle>
          <Star className='h-4 w-4 text-amber-500' />
        </CardHeader>
        <CardContent className='flex-1 p-0'>
          <div>
            <div className='flex items-center justify-between px-6 py-2'>
              <span className='text-xs text-muted-foreground'>Featured</span>
              <span className='text-xs font-medium'>{stats.featured}</span>
            </div>
            <div className='flex items-center justify-between px-6 py-2'>
              <span className='text-xs text-muted-foreground'>Not Featured</span>
              <span className='text-xs font-medium'>{(stats.total || 0) - (stats.featured || 0)}</span>
            </div>
          </div>
        </CardContent>
        <CardFooter className='flex items-baseline justify-between pt-3'>
          <span className='text-sm font-medium'>Featured</span>
          <span className='text-xl font-bold'>{stats.featured}</span>
        </CardFooter>
      </Card>
    </>
  );
}

function StatsCardsSkeleton() {
  return (
    <>
      {/* Total Services Card Skeleton */}
      <Card className='flex flex-col'>
        <CardHeader className='flex flex-row items-center justify-between pb-3'>
          <CardTitle className='text-sm'>Total Services</CardTitle>
          <Layers className='h-4 w-4 text-blue-600' />
        </CardHeader>
        <CardContent className='flex-1 p-0'>
          <div>
            <div className='flex items-center justify-between px-6 py-2'>
              <span className='text-xs text-muted-foreground'>Published</span>
              <Skeleton className='h-3 w-8' />
            </div>
            <div className='flex items-center justify-between px-6 py-2'>
              <span className='text-xs text-muted-foreground'>Approved</span>
              <Skeleton className='h-3 w-8' />
            </div>
            <div className='flex items-center justify-between px-6 py-2'>
              <span className='text-xs text-muted-foreground'>Pending</span>
              <Skeleton className='h-3 w-8' />
            </div>
            <div className='flex items-center justify-between px-6 py-2'>
              <span className='text-xs text-muted-foreground'>Draft</span>
              <Skeleton className='h-3 w-8' />
            </div>
            <div className='flex items-center justify-between px-6 py-2'>
              <span className='text-xs text-muted-foreground'>Rejected</span>
              <Skeleton className='h-3 w-8' />
            </div>
            <div className='flex items-center justify-between px-6 py-2'>
              <span className='text-xs text-muted-foreground'>Inactive</span>
              <Skeleton className='h-3 w-8' />
            </div>
          </div>
        </CardContent>
        <CardFooter className='flex items-baseline justify-between pt-3'>
          <span className='text-sm font-medium'>Total</span>
          <Skeleton className='h-7 w-12' />
        </CardFooter>
      </Card>

      {/* Type Card Skeleton */}
      <Card className='flex flex-col'>
        <CardHeader className='flex flex-row items-center justify-between pb-3'>
          <CardTitle className='text-sm'>Type</CardTitle>
          <MapPin className='h-4 w-4 text-red-600' />
        </CardHeader>
        <CardContent className='flex-1 p-0'>
          <div>
            <div className='flex items-center justify-between px-6 py-2'>
              <span className='text-xs text-muted-foreground'>Presence</span>
              <Skeleton className='h-3 w-8' />
            </div>
            <div className='flex items-center justify-between px-6 py-2'>
              <span className='text-xs text-muted-foreground flex items-center gap-1'>
                <span className='text-muted-foreground/40'>├─</span>
                On-base
              </span>
              <Skeleton className='h-3 w-8' />
            </div>
            <div className='flex items-center justify-between px-6 py-2'>
              <span className='text-xs text-muted-foreground flex items-center gap-1'>
                <span className='text-muted-foreground/40'>└─</span>
                On-site
              </span>
              <Skeleton className='h-3 w-8' />
            </div>
            <div className='flex items-center justify-between px-6 py-2'>
              <span className='text-xs text-muted-foreground'>Online</span>
              <Skeleton className='h-3 w-8' />
            </div>
            <div className='flex items-center justify-between px-6 py-2'>
              <span className='text-xs text-muted-foreground flex items-center gap-1'>
                <span className='text-muted-foreground/40'>├─</span>
                One-off
              </span>
              <Skeleton className='h-3 w-8' />
            </div>
            <div className='flex items-center justify-between px-6 py-2'>
              <span className='text-xs text-muted-foreground flex items-center gap-1'>
                <span className='text-muted-foreground/40'>└─</span>
                Subscription
              </span>
              <Skeleton className='h-3 w-8' />
            </div>
          </div>
        </CardContent>
        <CardFooter className='flex items-baseline justify-between pt-3'>
          <Skeleton className='h-4 w-16' />
          <Skeleton className='h-7 w-12' />
        </CardFooter>
      </Card>

      {/* 3. Pricing Card Skeleton */}
      <Card className='flex flex-col'>
        <CardHeader className='flex flex-row items-center justify-between pb-3'>
          <CardTitle className='text-sm'>Pricing</CardTitle>
          <Euro className='h-4 w-4 text-green-600' />
        </CardHeader>
        <CardContent className='flex-1 p-0'>
          <div>
            <div className='flex items-center justify-between px-6 py-2'>
              <span className='text-xs text-muted-foreground'>Fixed</span>
              <Skeleton className='h-3 w-8' />
            </div>
            <div className='flex items-center justify-between px-6 py-2'>
              <span className='text-xs text-muted-foreground'>Not Fixed</span>
              <Skeleton className='h-3 w-8' />
            </div>
            <div className='flex items-center justify-between px-6 py-2'>
              <span className='text-xs text-muted-foreground'>Subscription Type</span>
              <Skeleton className='h-3 w-16' />
            </div>
            <div className='flex items-center justify-between px-6 py-2'>
              <span className='text-xs text-muted-foreground'>Price (Avg)</span>
              <Skeleton className='h-3 w-8' />
            </div>
            <div className='flex items-center justify-between px-6 py-2'>
              <span className='text-xs text-muted-foreground'>Duration (Avg Days)</span>
              <Skeleton className='h-3 w-8' />
            </div>
          </div>
        </CardContent>
        <CardFooter className='flex items-baseline justify-between pt-3'>
          <Skeleton className='h-4 w-20' />
          <Skeleton className='h-7 w-12' />
        </CardFooter>
      </Card>

      {/* 4. Status Card Skeleton */}
      <Card className='flex flex-col'>
        <CardHeader className='flex flex-row items-center justify-between pb-3'>
          <CardTitle className='text-sm'>Status</CardTitle>
          <Star className='h-4 w-4 text-amber-500' />
        </CardHeader>
        <CardContent className='flex-1 p-0'>
          <div>
            <div className='flex items-center justify-between px-6 py-2'>
              <span className='text-xs text-muted-foreground'>Featured</span>
              <Skeleton className='h-3 w-8' />
            </div>
            <div className='flex items-center justify-between px-6 py-2'>
              <span className='text-xs text-muted-foreground'>Not Featured</span>
              <Skeleton className='h-3 w-8' />
            </div>
          </div>
        </CardContent>
        <CardFooter className='flex items-baseline justify-between pt-3'>
          <span className='text-sm font-medium'>Featured</span>
          <Skeleton className='h-7 w-12' />
        </CardFooter>
      </Card>
    </>
  );
}

export function AdminServicesStats() {
  return (
    <Suspense fallback={<StatsCardsSkeleton />}>
      <StatsCardsContent />
    </Suspense>
  );
}
