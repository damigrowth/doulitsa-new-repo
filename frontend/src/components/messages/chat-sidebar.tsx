import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getSession } from '@/actions/auth/server';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { ChatListContainer } from './chat-list-container';
import { getChats } from '@/actions/messages';

export async function ChatSidebar() {
  // Get current user session
  const session = (await (async () => { const r = await getSession(); return r.success && r.data?.user ? { user: r.data.user, session: r.data.session } : null; })());

  // Fetch real chats if user is authenticated
  const chats = session?.user ? await getChats(session.user.id) : [];

  return (
    <Card className='bg-card text-card-foreground flex flex-col rounded-xl border shadow-none py-6 h-full pb-0 w-full md:w-48 lg:w-64 xl:w-96'>
      <CardHeader className='@container/card-header grid auto-rows-min grid-rows-[auto] items-start gap-1.5 px-6 py-0 has-[data-slot=card-action]:grid-cols-[1fr_auto]'>
        <div className='flex items-center justify-between mb-4'>
          <CardTitle className='font-semibold font-display text-xl lg:text-2xl'>
            Μηνύματα
          </CardTitle>
          {/* <Button size='icon' variant='ghost' className='rounded-full border'>
            <Plus className='h-4 w-4' />
          </Button> */}
        </div>
      </CardHeader>
      <CardContent className='flex-1 overflow-hidden p-0'>
        {session?.user && (
          <ChatListContainer userId={session.user.id} initialChats={chats} />
        )}
      </CardContent>
    </Card>
  );
}
