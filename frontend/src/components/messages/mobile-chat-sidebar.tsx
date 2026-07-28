import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import { MessageSquare } from 'lucide-react';
import { ChatListContainer } from './chat-list-container';
import type { ChatListItem } from '@/lib/types/messages';

interface MobileChatSidebarProps {
  userId: string;
  initialChats: ChatListItem[];
}

export function MobileChatSidebar({
  userId,
  initialChats,
}: MobileChatSidebarProps) {
  return (
    <Drawer>
      <DrawerTrigger asChild>
        <Button
          size='icon'
          variant='outline'
          className='md:hidden flex-shrink-0 size-10 rounded-xl text-6xl text-primary'
          aria-label='Άνοιγμα συνομιλιών'
        >
          <MessageSquare className='size-6' />
        </Button>
      </DrawerTrigger>
      <DrawerContent className='h-[85vh]'>
        <DrawerHeader>
          <DrawerTitle className='font-semibold font-display text-xl'>
            Μηνύματα
          </DrawerTitle>
        </DrawerHeader>
        <div className='flex-1 overflow-hidden'>
          <ChatListContainer userId={userId} initialChats={initialChats} />
        </div>
      </DrawerContent>
    </Drawer>
  );
}
