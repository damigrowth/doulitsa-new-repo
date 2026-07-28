import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowRight,
  BarChart3,
  ExternalLink,
  FileText,
  MessageSquare,
  Settings,
  Plus,
  Star,
  User,
  Zap,
} from 'lucide-react';

import { getCurrentUser, isProfessional } from '@/actions/auth/server';
import { getUserServiceStats } from '@/actions/services/get-user-services';
import { canCreateService } from '@/lib/subscription/feature-gate';
import CreateServiceButton from './services/create-service-button';
import { getUserTotalReviewCount } from '@/actions/reviews/get-user-reviews';
import { getChats } from '@/actions/messages/chats';
import { NextLink } from '@/components';
import { timeAgo } from '@/lib/utils/formatting/time';
import { ShareReviewLinkAsync } from './reviews/share-review-link-async';
import NoServiceDialog from './no-service-dialog';

export default async function DashboardContent() {
  const userResult = await getCurrentUser();
  const professionalResult = await isProfessional();

  const user = userResult.success ? userResult.data.user : null;
  const profile = userResult.success ? userResult.data.profile : null;
  const userHasAccess = professionalResult.success
    ? professionalResult.data
    : false;

  const userId = user?.id;
  const displayName =
    user?.displayName || user?.name || profile?.firstName || 'User';

  if (!userHasAccess) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Καλώς ήρθες, {displayName}!</CardTitle>
          <CardDescription>
            Μπορείς να συμπληρώσεις τα στοιχεία σου και να εξερευνήσεις την
            πλατφόρμα.
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          <p className='text-sm text-muted-foreground'>
            Μπορείς να συμπληρώσεις τα στοιχεία σου στην{' '}
            <NextLink
              href='/dashboard/profile/account'
              className='font-semibold text-primary hover:underline'
            >
              Διαχείριση Προφίλ
            </NextLink>
            . Ακόμα, μπορείς να αποθηκεύσεις τις Αγαπημένες σου υπηρεσίες και τα
            προφίλ. Εάν έχεις έρθει σε επικοινωνία με κάποιον επαγγελματία, μη
            διστάσεις να υποβάλεις μια αξιολόγηση. Θα βοηθήσεις έτσι, και άλλους
            χρήστες να βρουν αυτό που ψάχνουν!
          </p>
          <div className='flex flex-wrap gap-3 pt-4'>
            <Button asChild>
              <NextLink href='/categories'>
                Όλες οι Υπηρεσίες
                <ArrowRight className='ml-2 h-4 w-4' />
              </NextLink>
            </Button>
            <Button variant='outline' asChild>
              <NextLink href='/directory'>
                Επαγγελματικός Κατάλογος
                <ArrowRight className='ml-2 h-4 w-4' />
              </NextLink>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Fetch all dashboard data in parallel
  const [statsResult, reviewCountResult, recentChats, canCreateMore] = await Promise.all([
    getUserServiceStats(),
    getUserTotalReviewCount(),
    userId ? getChats(userId).catch(() => []) : Promise.resolve([]),
    profile?.id ? canCreateService(profile.id) : Promise.resolve(true),
  ]);

  const totalServices = statsResult.success ? statsResult.data.published : 0;
  const totalReviews = reviewCountResult.success ? reviewCountResult.data.total : 0;
  const hasServices = statsResult.success ? statsResult.data.total > 0 : true;
  const latestChats = recentChats.slice(0, 3);

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div className='space-y-2'>
        <h1 className='text-3xl font-bold tracking-tight'>Πίνακας Ελέγχου</h1>
        <p className='text-muted-foreground'>
          Καλώς ήρθατε! Βελτιώστε την εικόνα σας, προσθέστε πληροφορίες στο
          επαγγελματικό προφίλ σας και προσθέστε όλες τις υπηρεσίες σας για να
          σας βρουν περισσότεροι χρήστες!
        </p>
      </div>

      {/* Stats Cards */}
      <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
        <ShareReviewLinkAsync className='lg:col-span-2' />

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Υπηρεσίες</CardTitle>
            <BarChart3 className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>{totalServices}</div>
            <Badge variant='secondary' className='mt-2'>
              Ενεργές υπηρεσίες
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Αξιολογήσεις</CardTitle>
            <Star className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>{totalReviews}</div>
            <Badge variant='secondary' className='mt-2'>
              Συνολικές αξιολογήσεις
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions and Recent Activity */}
      <div className='grid gap-6 md:grid-cols-2'>
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <Zap className='h-5 w-5' />
              Συντομεύσεις
            </CardTitle>
            <CardDescription>
              Γρήγορη πρόσβαση στις κύριες λειτουργίες
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-3'>
            <Button variant='outline' className='w-full justify-start' asChild>
              <NextLink href='/dashboard/services'>
                <FileText className='mr-2 h-4 w-4' />
                Διαχείριση Υπηρεσιών
                <ArrowRight className='ml-auto h-4 w-4' />
              </NextLink>
            </Button>
            <CreateServiceButton
              canCreateMore={canCreateMore}
              variant='outline'
              className='w-full justify-start'
            >
              <Plus className='mr-2 h-4 w-4' />
              Προσθήκη Υπηρεσίας
              <ArrowRight className='ml-auto h-4 w-4' />
            </CreateServiceButton>
            {user?.username && (
              <Button variant='outline' className='w-full justify-start' asChild>
                <NextLink
                  href={`/profile/${user.username}`}
                  target='_blank'
                  rel='noopener noreferrer'
                >
                  <User className='mr-2 h-4 w-4' />
                  Προφίλ
                  <ExternalLink className='ml-auto h-4 w-4' />
                </NextLink>
              </Button>
            )}
            <Button variant='outline' className='w-full justify-start' asChild>
              <NextLink href='/dashboard/profile/account'>
                <Settings className='mr-2 h-4 w-4' />
                Διαχείριση Προφίλ
                <ArrowRight className='ml-auto h-4 w-4' />
              </NextLink>
            </Button>
          </CardContent>
        </Card>

        {/* Recent Messages */}
        <Card className='overflow-hidden'>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <MessageSquare className='h-5 w-5' />
              Τελευταία Μηνύματα
            </CardTitle>
          </CardHeader>
          <CardContent>
            {latestChats.length > 0 ? (
              <div className='space-y-3'>
                {latestChats.map((chat) => (
                  <NextLink
                    key={chat.id}
                    href={`/dashboard/messages/${chat.cid || chat.id}`}
                    className='flex items-center gap-3 rounded-md border p-3 transition-colors hover:bg-muted/50'
                  >
                    <div className='flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary overflow-hidden'>
                      {chat.image ? (
                        <img
                          src={chat.image}
                          alt={chat.displayName ?? chat.name ?? ''}
                          className='h-full w-full object-cover'
                        />
                      ) : (
                        (chat.displayName ?? chat.name ?? '?').charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className='min-w-0 flex-1'>
                      <div className='flex items-center justify-between gap-2'>
                        <span className='truncate text-sm font-medium'>
                          {chat.displayName ?? chat.name ?? 'Άγνωστος χρήστης'}
                        </span>
                        <span className='shrink-0 text-xs text-muted-foreground'>
                          {timeAgo(chat.lastActivity)}
                        </span>
                      </div>
                      {chat.lastMessage && (
                        <p className='truncate text-xs text-muted-foreground'>
                          {typeof chat.lastMessage === 'string'
                            ? chat.lastMessage
                            : chat.lastMessage?.content ?? ''}
                        </p>
                      )}
                    </div>
                    {chat.unread > 0 && (
                      <Badge variant='default' className='shrink-0 text-xs'>
                        {chat.unread}
                      </Badge>
                    )}
                  </NextLink>
                ))}
                <Button variant='ghost' className='w-full' asChild>
                  <NextLink href='/dashboard/messages'>
                    Όλα τα μηνύματα
                    <ArrowRight className='ml-2 h-4 w-4' />
                  </NextLink>
                </Button>
              </div>
            ) : (
              <div className='text-sm text-muted-foreground text-center py-8'>
                Δεν υπάρχουν μηνύματα μέχρι τώρα. Βελτιώστε την εμφάνιση του
                επαγγελματικού προφίλ και των υπηρεσιών σας για να σας ξεχωρίσουν
                περισσότεροι χρήστες!
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Prompt to create first service */}
      {!hasServices && <NoServiceDialog sessionId={userResult.success ? userResult.data.session?.id : undefined} />}
    </div>
  );
}
