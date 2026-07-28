import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BellIcon, CheckIcon, XIcon } from 'lucide-react';
import { NextLink } from '@/components';
import {
  getAdminNotifications,
  type AdminNotification,
} from '@/actions/admin/notifications';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function NotificationCard({ notification }: { notification: AdminNotification }) {
  return (
    <Card
      className={
        notification.status === 'unread' ? 'border-blue-200' : ''
      }
    >
      <CardHeader className='pb-3'>
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-2'>
            <CardTitle className='text-sm font-medium'>
              {notification.href ? (
                <NextLink
                  href={notification.href}
                  className='hover:text-primary hover:underline'
                >
                  {notification.title}
                </NextLink>
              ) : (
                notification.title
              )}
            </CardTitle>
            <Badge
              variant={
                notification.priority === 'high'
                  ? 'destructive'
                  : notification.priority === 'medium'
                    ? 'default'
                    : 'secondary'
              }
              className='text-xs'
            >
              {notification.priority}
            </Badge>
            {notification.status === 'unread' && (
              <Badge variant='outline' className='text-xs bg-blue-50'>
                New
              </Badge>
            )}
          </div>
          <div className='flex items-center gap-1'>
            <Button variant='ghost' size='sm'>
              <CheckIcon className='h-4 w-4' />
            </Button>
            <Button variant='ghost' size='sm'>
              <XIcon className='h-4 w-4' />
            </Button>
          </div>
        </div>
        <CardDescription>{notification.message}</CardDescription>
      </CardHeader>
      <CardContent className='pt-0'>
        <p className='text-xs text-muted-foreground'>{notification.time}</p>
      </CardContent>
    </Card>
  );
}

function renderList(notifications: AdminNotification[]) {
  if (notifications.length === 0) {
    return (
      <Card>
        <CardContent className='py-12 text-center text-sm text-muted-foreground'>
          Δεν υπάρχουν ειδοποιήσεις σε αυτή την κατηγορία.
        </CardContent>
      </Card>
    );
  }
  return (
    <div className='space-y-4'>
      {notifications.map((n) => (
        <NotificationCard key={n.id} notification={n} />
      ))}
    </div>
  );
}

export default async function NotificationsPage() {
  const result = await getAdminNotifications();
  const bundle =
    result.success && result.data
      ? result.data
      : { notifications: [], total: 0, unread: 0, highPriority: 0 };
  const { notifications, unread, highPriority } = bundle;

  return (
    <div className='flex flex-col gap-6 py-4'>
      <div className='px-4 lg:px-6'>
        <div className='flex items-center justify-between'>
          <div>
            <h1 className='text-2xl font-bold tracking-tight'>Notifications</h1>
            <p className='text-muted-foreground'>
              Manage system notifications and alerts
            </p>
          </div>
          <div className='flex gap-2'>
            <Button variant='outline' size='sm'>
              Mark All as Read
            </Button>
            <Button size='sm'>
              <BellIcon className='mr-2 h-4 w-4' />
              Send Notification
            </Button>
          </div>
        </div>
      </div>

      <div className='px-4 lg:px-6'>
        <Tabs defaultValue='all' className='space-y-4'>
          <TabsList>
            <TabsTrigger value='all'>All ({notifications.length})</TabsTrigger>
            <TabsTrigger value='unread'>Unread ({unread})</TabsTrigger>
            <TabsTrigger value='high'>High Priority ({highPriority})</TabsTrigger>
            <TabsTrigger value='system'>System</TabsTrigger>
          </TabsList>

          <TabsContent value='all' className='space-y-4'>
            {renderList(notifications)}
          </TabsContent>

          <TabsContent value='unread' className='space-y-4'>
            {renderList(notifications.filter((n) => n.status === 'unread'))}
          </TabsContent>

          <TabsContent value='high' className='space-y-4'>
            {renderList(notifications.filter((n) => n.priority === 'high'))}
          </TabsContent>

          <TabsContent value='system' className='space-y-4'>
            {renderList(notifications.filter((n) => n.type === 'taxonomy'))}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
