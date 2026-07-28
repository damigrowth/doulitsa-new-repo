import { redirect } from 'next/navigation';
import { getSession } from '@/actions/auth/server';
import { getChats } from '@/actions/messages';
import { getDashboardMetadata } from '@/lib/seo/pages';
import { ChatSidebar } from '@/components/messages/chat-sidebar';

// Force dynamic rendering for this route (auth-protected, user-specific data)
export const dynamic = 'force-dynamic';

export const metadata = getDashboardMetadata('Μηνύματα');

export default async function MessagesIndexPage() {
  const session = (await (async () => { const r = await getSession(); return r.success && r.data?.user ? { user: r.data.user, session: r.data.session } : null; })());

  if (!session?.user) {
    redirect('/sign-in');
  }

  // Fetch user's chats (already filtered for active messages)
  const chats = await getChats(session.user.id);

  // If user has active chats, redirect to first one
  if (chats.length > 0) {
    // Use the cid from the already filtered chat list
    const chatPath = chats[0].cid || chats[0].id;
    redirect(`/dashboard/messages/${chatPath}`);
  }

  // No chats - show empty state
  return (
    <div className='flex h-[calc(100vh-6rem)] w-full gap-0'>
      {/* Left Sidebar - Chat List (Always visible when no chats) */}
      <ChatSidebar />

      {/* Right - Empty State (Hidden on mobile when no chats) */}
      <div className='hidden md:flex flex-1 w-full items-center justify-center'>
        <div className='text-center'>
          <p className='text-muted-foreground text-lg'>
          Βρείτε ένα επαγγελματικό προφίλ που σας ενδιαφέρει και ξεκινήστε μια συνομιλία!
          </p>
        </div>
      </div>
    </div>
  );
}
