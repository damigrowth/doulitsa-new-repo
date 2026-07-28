/**
 * Server Component: Chat Header Display
 * Pure presentation - interactive parts moved to HeaderActions client component
 */

import { ChatHeaderUser, ChatListItem } from '@/lib/types/messages';
import { getProfileUrl } from '@/lib/utils/messages';
import { NextLink } from '@/components';
import UserAvatar from '@/components/shared/user-avatar';
import { MobileChatListButton } from './mobile-chat-list-button';

interface ChatHeaderProps {
  chatId: string;
  currentUserId: string;
  user: ChatHeaderUser;
  chats?: ChatListItem[];
  showMobileChatButton?: boolean;
}

export function ChatHeader({
  chatId,
  currentUserId,
  user,
  chats,
  showMobileChatButton = false,
}: ChatHeaderProps) {
  const displayName =
    user.displayName || user.firstName || user.lastName || 'Unknown User';
  const profileUrl = getProfileUrl(user.username);

  // Create profile content that's either clickable or not based on user type
  const profileContent = (
    <>
      <div className='relative'>
        <UserAvatar
          displayName={displayName}
          firstName={user.firstName}
          lastName={user.lastName}
          image={user.image}
          size='sm'
          className='h-9 w-9'
          showBorder={false}
          showShadow={false}
        />
      </div>
      <div>
        <h2 className='text-sm font-semibold mb-0'>{displayName}</h2>
      </div>
    </>
  );

  return (
    <div className='sticky top-0 z-10 bg-background'>
      {/* Mobile Chat List Button */}
      {showMobileChatButton && chats && (
        <div className='px-4 pt-4 pb-2 md:hidden'>
          <MobileChatListButton userId={currentUserId} initialChats={chats} />
        </div>
      )}

      <div className='flex items-center justify-between py-2 sm:pl-2'>
        <div className='flex items-center gap-3'>
          {user.type === 'pro' && user.username ? (
            <NextLink
              href={profileUrl}
              target='_blank'
              rel='noopener noreferrer'
              className='flex items-center gap-3 hover:opacity-80 transition-opacity'
            >
              {profileContent}
            </NextLink>
          ) : (
            <div className='flex items-center gap-3'>{profileContent}</div>
          )}
        </div>
      </div>
    </div>
  );
}
