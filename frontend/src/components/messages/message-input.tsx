'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  EmojiPicker,
  EmojiPickerSearch,
  EmojiPickerContent,
  EmojiPickerFooter,
} from '@/components/ui/emoji-picker';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Smile, Send } from 'lucide-react';
import { useMessageOptimistic } from '@/lib/hooks/chat/use-message-optimistic';
import { MessageReplyPreview } from './message-reply-preview';
import { MobileChatSidebar } from './mobile-chat-sidebar';

export interface ReplyToMessage {
  id: string;
  content: string;
  authorName: string;
  isOwn: boolean;
}

export interface EditingMessage {
  id: string;
  content: string;
}

interface MessageInputProps {
  chatId: string;
  currentUserId: string;
  replyTo: ReplyToMessage | null;
  onCancelReply: () => void;
  chats?: any[]; // For mobile sidebar
}

export function MessageInput({
  chatId,
  currentUserId,
  replyTo,
  onCancelReply,
  chats,
}: MessageInputProps) {
  const [message, setMessage] = useState('');
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Use optimistic hook for instant feedback
  const { sendOptimisticMessage } = useMessageOptimistic({
    chatId,
    currentUserId,
  });

  // Focus input when replying
  useEffect(() => {
    if (replyTo && inputRef.current) {
      inputRef.current.focus();
    }
  }, [replyTo]);

  const handleSend = async () => {
    if (!message.trim()) return;

    // Handle new message
    const messageToSend = message;
    const replyToId = replyTo?.id;

    setMessage(''); // Clear input immediately
    onCancelReply(); // Clear reply state

    await sendOptimisticMessage(messageToSend, replyToId); // Send with optimistic UI
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleEmojiSelect = ({ emoji }: { emoji: string }) => {
    setMessage((prev) => prev + emoji);
    setIsEmojiPickerOpen(false);
  };

  return (
    <div className='py-0'>
      {replyTo && (
        <MessageReplyPreview
          authorName={replyTo.authorName}
          content={replyTo.content}
          isOwn={replyTo.isOwn}
          onCancel={onCancelReply}
        />
      )}
      <div className='flex items-end gap-2 px-0 pb-0 sm:pb-2 sm:px-2 '>
        <MobileChatSidebar userId={currentUserId} initialChats={chats || []} />

        <div className='relative w-full'>
          <Input
            ref={inputRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              replyTo
                ? 'Πληκτρολογήστε την απάντησή σας...'
                : 'Εισάγετε μήνυμα...'
            }
            className='pr-24 pl-4 h-14 rounded-xl shadow-none'
          />
          <div className='absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2'>
            <div className='relative'>
              <Popover
                open={isEmojiPickerOpen}
                onOpenChange={setIsEmojiPickerOpen}
              >
                <Tooltip>
                  <PopoverTrigger asChild>
                    <TooltipTrigger asChild>
                      <Button
                        size='icon'
                        variant='ghost'
                        className='size-9 rounded-full opacity-60 hover:opacity-100'
                      >
                        <Smile className='size-6' />
                      </Button>
                    </TooltipTrigger>
                  </PopoverTrigger>
                  <TooltipContent>
                    <p>Emoji</p>
                  </TooltipContent>
                </Tooltip>
                <PopoverContent
                  className='w-fit p-0'
                  align='end'
                  side='top'
                  sideOffset={8}
                >
                  <EmojiPicker
                    className='h-[342px]'
                    onEmojiSelect={handleEmojiSelect}
                  >
                    <EmojiPickerSearch />
                    <EmojiPickerContent />
                    <EmojiPickerFooter />
                  </EmojiPicker>
                </PopoverContent>
              </Popover>
            </div>
            <Button
              onClick={handleSend}
              size='icon'
              variant='black'
              className='size-9 rounded-xl'
              disabled={!message.trim()}
            >
              <Send className='size-6' />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
