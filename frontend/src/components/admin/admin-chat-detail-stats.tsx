import { MessageSquareIcon, CalendarIcon, UserIcon } from 'lucide-react';
import UserAvatar from '@/components/shared/user-avatar';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import type { AdminChatDetailStats } from '@/actions/admin/chats';

interface AdminChatDetailStatsProps {
  stats: AdminChatDetailStats | null;
}

export function AdminChatDetailStats({ stats }: AdminChatDetailStatsProps) {
  // Show error state if stats failed to load
  if (!stats) {
    return (
      <div className='px-4 lg:px-6'>
        <Card>
          <CardContent className='pt-6'>
            <p className='text-sm text-muted-foreground'>
              Failed to load chat statistics. Please try refreshing the page.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className='grid gap-4 px-4 md:grid-cols-2 lg:grid-cols-4 lg:px-6'>
      {/* Total Messages Card */}
      <Card>
        <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
          <CardTitle className='text-sm font-medium'>Total Messages</CardTitle>
          <MessageSquareIcon className='h-4 w-4 text-muted-foreground' />
        </CardHeader>
        <CardContent>
          <div className='text-2xl font-bold'>{stats.totalMessages.toLocaleString()}</div>
          <p className='text-xs text-muted-foreground'>All messages in chat</p>
        </CardContent>
      </Card>

      {/* Messages Today Card */}
      <Card>
        <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
          <CardTitle className='text-sm font-medium'>Messages Today</CardTitle>
          <CalendarIcon className='h-4 w-4 text-muted-foreground' />
        </CardHeader>
        <CardContent>
          <div className='text-2xl font-bold'>{stats.messagesToday.toLocaleString()}</div>
          <p className='text-xs text-muted-foreground'>Sent today</p>
        </CardContent>
      </Card>

      {/* Creator Card */}
      <Card>
        <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
          <CardTitle className='text-sm font-medium'>Αποστολέας</CardTitle>
          <UserIcon className='h-4 w-4 text-muted-foreground' />
        </CardHeader>
        <CardContent>
          {stats.creator ? (
            <div className='flex items-center gap-3'>
              <UserAvatar
                displayName={stats.creator.displayName ?? undefined}
                size='sm'
                className='h-10 w-10'
                showBorder={false}
                showShadow={false}
              />
              <div className='space-y-0.5'>
                <div className='text-sm font-medium'>
                  {stats.creator.displayName || 'Χρήστης'}
                </div>
                {stats.creator.email && (
                  <div className='text-xs text-muted-foreground'>
                    {stats.creator.email}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <p className='text-xs text-muted-foreground'>No creator</p>
          )}
        </CardContent>
      </Card>

      {/* Member Card */}
      <Card>
        <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
          <CardTitle className='text-sm font-medium'>Παραλήπτης</CardTitle>
          <UserIcon className='h-4 w-4 text-muted-foreground' />
        </CardHeader>
        <CardContent>
          {stats.member ? (
            <div className='flex items-center gap-3'>
              <UserAvatar
                displayName={stats.member.displayName ?? undefined}
                size='sm'
                className='h-10 w-10'
                showBorder={false}
                showShadow={false}
              />
              <div className='space-y-0.5'>
                <div className='text-sm font-medium'>
                  {stats.member.displayName || 'Χρήστης'}
                </div>
                {stats.member.email && (
                  <div className='text-xs text-muted-foreground'>
                    {stats.member.email}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <p className='text-xs text-muted-foreground'>No member</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
