import { ChatSidebar } from '@/components/messages/chat-sidebar';
import { HeaderPresence } from '@/components/messages/header-presence';
import { MessagesContainerWithSidebar } from '@/components/messages/messages-container-with-sidebar';
import { getChats, getMessages } from '@/actions/messages';
import { getSession } from '@/actions/auth/server';
import * as messagingApi from '@/lib/api/messaging';
import { ApiError } from '@/lib/api/client';
import type { ChatHeaderUser, ChatListItem } from '@/lib/types/messages';
import { getDashboardMetadata } from '@/lib/seo/pages';
import { redirect, notFound } from 'next/navigation';

// Real-time chat with Channels WebSocket — disable Next route caching
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = false;
export const dynamicParams = true;

export const metadata = getDashboardMetadata('Μηνύματα');

interface MessagesPageProps {
  params: Promise<{ chatId: string }>;
}

export default async function MessagesPage({ params }: MessagesPageProps) {
  const sessionResult = await getSession();
  if (!sessionResult.success || !sessionResult.data?.user) {
    redirect('/sign-in');
  }
  const userId = sessionResult.data.user.id;

  const { chatId } = await params;

  // Look up chat (Django accepts either id OR cid)
  let chat: { id: string } | null = null;
  try {
    const detail = await messagingApi.getChat(chatId);
    if (detail) chat = { id: (detail as { id: string }).id };
  } catch (err) {
    if (!(err instanceof ApiError) || err.status !== 404) {
      throw err;
    }
  }
  if (!chat) {
    notFound();
  }
  const selectedChatId = chat.id;

  // Fetch all chats + messages
  const chats = (await getChats(userId)) as ChatListItem[];
  const messages = await getMessages(selectedChatId, userId);

  const selectedChat = chats.find((c) => c.id === selectedChatId);

  // Other member's profile for the header — pulled from chat detail payload
  let headerUser: ChatHeaderUser | null = null;
  try {
    const detail = (await messagingApi.getChat(selectedChatId)) as {
      members: {
        userId: string;
        online: boolean;
        displayName: string | null;
        image: string | null;
        username: string | null;
      }[];
    } | null;
    if (detail) {
      const otherMember = detail.members.find((m) => m.userId !== userId);
      if (otherMember) {
        headerUser = {
          userId: otherMember.userId,
          displayName: otherMember.displayName ?? null,
          firstName: null,
          lastName: null,
          image: otherMember.image ?? null,
          username: otherMember.username ?? null,
          online: otherMember.online,
          phone: null,
          type: null,
        };
      }
    }
  } catch {
    headerUser = null;
  }

  if (!headerUser) {
    return (
      <div className='flex h-full md:h-[calc(100vh-6rem)] w-full gap-4'>
        <div className='hidden md:block'>
          <ChatSidebar />
        </div>
        <div className='flex-1 w-full'>
          <div className='flex h-full items-center justify-center'>
            <div className='text-center'>
              <p className='text-muted-foreground text-lg'>
                Αυτή η συνομιλία δεν είναι διαθέσιμη
              </p>
              <p className='text-muted-foreground text-sm mt-2'>
                Ο άλλος χρήστης μπορεί να έχει διαγραφεί ή να μην είναι διαθέσιμος
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='flex h-full md:h-[calc(100vh-6rem)] w-full gap-4'>
      <div className='hidden md:block'>
        <ChatSidebar />
      </div>
      <div className='flex-1 w-full'>
        <div
          key={selectedChatId}
          className='bg-background flex h-full flex-col p-2 text-card-foreground rounded-xl border shadow-none '
        >
          <HeaderPresence
            chatId={selectedChatId}
            currentUserId={userId}
            user={headerUser}
            chats={chats}
            showMobileChatButton={true}
          />
          <MessagesContainerWithSidebar
            chatId={selectedChatId}
            currentUserId={userId}
            initialMessages={messages}
            chats={chats}
          />
        </div>
      </div>
    </div>
  );
}
