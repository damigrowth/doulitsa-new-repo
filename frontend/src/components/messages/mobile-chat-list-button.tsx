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

interface MobileChatListButtonProps {
  userId: string;
  initialChats: ChatListItem[];
}

export function MobileChatListButton({
  userId,
  initialChats,
}: MobileChatListButtonProps) {
  return (
    <Drawer>
      <DrawerTrigger asChild>
        <Button
          variant='outline'
          className='md:hidden w-full rounded-xl text-sm font-medium'
          aria-label='Όλες οι Συνομιλίες'
        >
          <MessageSquare className='size-4 mr-1' />
          Ολες οι Συνομιλίες
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
