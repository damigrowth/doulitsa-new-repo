import { Suspense } from 'react';
import { Mail, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { getBrevoListStats } from '@/actions/admin/profiles';

const BREVO_LIST_DESCRIPTIONS = {
  users: 'user.type === "user"',
  emptyProfile: 'user.type === "pro" AND (no profile OR step !== "DASHBOARD")',
  noServices: 'user.type === "pro" AND has profile AND step === "DASHBOARD" AND 0 published services',
  activePros: 'user.type === "pro" AND has profile AND step === "DASHBOARD" AND ≥1 published services',
};

function InfoTooltip({ description }: { description: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Info className='h-4 w-4 text-muted-foreground hover:text-foreground transition-colors cursor-help flex-shrink-0 ml-2' />
      </TooltipTrigger>
      <TooltipContent className='max-w-xs'>
        <p>{description}</p>
      </TooltipContent>
    </Tooltip>
  );
}

async function BrevoStatsContent() {
  const statsResult = await getBrevoListStats();

  if (!statsResult.success || !statsResult.data) {
    return <BrevoStatsSkeleton />;
  }

  const stats = statsResult.data;

  return (
    <Card className='flex flex-col'>
      <CardHeader className='flex flex-row items-center justify-between pb-3'>
        <CardTitle className='text-sm'>Brevo Lists</CardTitle>
        <Mail className='h-4 w-4 text-blue-500' />
      </CardHeader>
      <CardContent className='flex-1 p-0'>
        <div>
          <div className='flex items-center justify-between px-6 py-2'>
            <span className='text-xs text-muted-foreground flex items-center'>
              simpleusers (USERS)
              <InfoTooltip description={BREVO_LIST_DESCRIPTIONS.users} />
            </span>
            <span className='text-xs font-medium'>{stats.users}</span>
          </div>
          <div className='flex items-center justify-between px-6 py-2'>
            <span className='text-xs text-muted-foreground flex items-center'>
              emptyprofile (EMPTYPROFILE)
              <InfoTooltip description={BREVO_LIST_DESCRIPTIONS.emptyProfile} />
            </span>
            <span className='text-xs font-medium'>{stats.emptyProfile}</span>
          </div>
          <div className='flex items-center justify-between px-6 py-2'>
            <span className='text-xs text-muted-foreground flex items-center'>
              noservice (NOSERVICES)
              <InfoTooltip description={BREVO_LIST_DESCRIPTIONS.noServices} />
            </span>
            <span className='text-xs font-medium'>{stats.noServices}</span>
          </div>
          <div className='flex items-center justify-between px-6 py-2'>
            <span className='text-xs text-muted-foreground flex items-center'>
              activepros (PROS)
              <InfoTooltip description={BREVO_LIST_DESCRIPTIONS.activePros} />
            </span>
            <span className='text-xs font-medium'>{stats.activePros}</span>
          </div>
        </div>
      </CardContent>
      <CardFooter className='flex items-baseline justify-between pt-3'>
        <span className='text-sm font-medium'>Total</span>
        <span className='text-xl font-bold'>{stats.total}</span>
      </CardFooter>
    </Card>
  );
}

function BrevoStatsSkeleton() {
  return (
    <Card className='flex flex-col'>
      <CardHeader className='flex flex-row items-center justify-between pb-3'>
        <CardTitle className='text-sm'>Brevo Lists</CardTitle>
        <Mail className='h-4 w-4 text-blue-500' />
      </CardHeader>
      <CardContent className='flex-1 p-0'>
        <div>
          <div className='flex items-center justify-between px-6 py-2'>
            <span className='text-xs text-muted-foreground'>simpleusers (USERS)</span>
            <Skeleton className='h-3 w-8' />
          </div>
          <div className='flex items-center justify-between px-6 py-2'>
            <span className='text-xs text-muted-foreground'>emptyprofile (EMPTYPROFILE)</span>
            <Skeleton className='h-3 w-8' />
          </div>
          <div className='flex items-center justify-between px-6 py-2'>
            <span className='text-xs text-muted-foreground'>noservice (NOSERVICES)</span>
            <Skeleton className='h-3 w-8' />
          </div>
          <div className='flex items-center justify-between px-6 py-2'>
            <span className='text-xs text-muted-foreground'>activepros (PROS)</span>
            <Skeleton className='h-3 w-8' />
          </div>
        </div>
      </CardContent>
      <CardFooter className='flex items-baseline justify-between pt-3'>
        <Skeleton className='h-4 w-12' />
        <Skeleton className='h-6 w-12' />
      </CardFooter>
    </Card>
  );
}

export function AdminBrevoStats() {
  return (
    <Suspense fallback={<BrevoStatsSkeleton />}>
      <BrevoStatsContent />
    </Suspense>
  );
}
