/**
 * Client Component: Chat Messages Display
 * Pure presentation - interactive parts moved to MessageActions client component
 */

'use client';

import { RefObject } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Loader2, Check, CheckCheck } from 'lucide-react';
import { MessageActions } from './message-actions';
import { MessageReplyQuote } from './message-reply-quote';
import { ReactionPicker } from './reaction-picker';
import { ChatMessageItem } from '@/lib/types/messages';
import { ReplyToMessage } from './message-input';
import { formatMessageTime, formatChatDateDivider } from '@/lib/utils/messages';
import { toast } from 'sonner';
import { toggleReaction } from '@/actions/messages/reactions';

interface ChatMessagesProps {
  messages: ChatMessageItem[];
  scrollRef?: RefObject<HTMLDivElement>;
  currentUserId: string;
  onReply?: (replyTo: ReplyToMessage) => void;
  loadTriggerRef?: RefObject<HTMLDivElement>;
  isLoadingOlder?: boolean;
  hasMore?: boolean;
}

export function ChatMessages({
  messages,
  scrollRef,
  currentUserId,
  onReply,
  loadTriggerRef,
  isLoadingOlder,
  hasMore,
}: ChatMessagesProps) {
  const handleReply = (message: ChatMessageItem) => {
    if (onReply) {
      onReply({
        id: message.id,
        content: message.content,
        authorName:
          message.author?.displayName ||
          message.author?.firstName ||
          message.author?.lastName ||
          'Unknown User',
        isOwn: message.isOwn,
      });
    }
  };

  const handleCopyMessage = async (content: string) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(content);
        toast.success('Message copied to clipboard');
      } else {
        // Fallback for non-HTTPS or older browsers
        const textArea = document.createElement('textarea');
        textArea.value = content;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.select();
        try {
          // @ts-ignore - execCommand is deprecated but needed as fallback
          document.execCommand('copy');
          toast.success('Message copied to clipboard');
        } catch (err) {
          toast.error('Failed to copy message');
        }
        document.body.removeChild(textArea);
      }
    } catch (error) {
      console.error('Failed to copy message:', error);
      toast.error('Failed to copy message');
    }
  };

  const handleToggleReaction = async (messageId: string, emoji: string) => {
    try {
      await toggleReaction(messageId, currentUserId, emoji);
    } catch (error) {
      console.error('Failed to toggle reaction:', error);
      toast.error('Failed to add reaction');
    }
  };

  const shouldShowDateDivider = (index: number) => {
    if (index === 0) return true;
    const currentMessage = messages[index];
    const prevMessage = messages[index - 1];
    const currentDate = currentMessage.createdAt.toISOString().split('T')[0];
    const prevDate = prevMessage.createdAt.toISOString().split('T')[0];
    return currentDate !== prevDate;
  };

  const getMessageSpacing = (index: number) => {
    const currentMessage = messages[index];
    const prevMessage = index > 0 ? messages[index - 1] : null;

    if (!prevMessage) return '';

    // If date changed, no margin (divider handles spacing)
    const currentDate = currentMessage.createdAt.toISOString().split('T')[0];
    const prevDate = prevMessage.createdAt.toISOString().split('T')[0];
    if (currentDate !== prevDate) {
      return '';
    }

    // If sender changed, add more spacing
    if (prevMessage.isOwn !== currentMessage.isOwn) {
      return 'mt-4';
    }

    // Same sender, keep tight spacing
    return 'mt-1.5';
  };

  const getMessageRadius = (index: number) => {
    const currentMessage = messages[index];
    const prevMessage = index > 0 ? messages[index - 1] : null;
    const nextMessage =
      index < messages.length - 1 ? messages[index + 1] : null;

    const isFirstInGroup =
      !prevMessage || prevMessage.isOwn !== currentMessage.isOwn;
    const isLastInGroup =
      !nextMessage || nextMessage.isOwn !== currentMessage.isOwn;

    const groupPosition =
      `${isFirstInGroup ? 'first' : ''}${isLastInGroup ? 'last' : ''}` ||
      'middle';

    switch (groupPosition) {
      case 'firstlast':
        // Single message
        return currentMessage.isOwn
          ? 'rounded-bubble-right'
          : 'rounded-bubble-left';

      case 'first':
        // First in group
        return currentMessage.isOwn
          ? 'rounded-tl-2xl rounded-tr-2xl rounded-bl-2xl rounded-br'
          : 'rounded-tl-2xl rounded-tr-2xl rounded-bl rounded-br-2xl';

      case 'last':
        // Last in group
        return currentMessage.isOwn
          ? 'rounded-tl-2xl rounded-tr rounded-bl-2xl rounded-br-2xl'
          : 'rounded-tl rounded-tr-2xl rounded-bl-2xl rounded-br-2xl';

      case 'middle':
      default:
        // Middle of group
        return currentMessage.isOwn
          ? 'rounded-tl-2xl rounded-tr rounded-bl-2xl rounded-br'
          : 'rounded-tl rounded-tr-2xl rounded-bl rounded-br-2xl';
    }
  };

  return (
    <ScrollArea
      className='flex-1 pl-0 p-0 sm:p-2'
      scrollBarClassName='hidden'
      ref={scrollRef}
    >
      <div className='pb-4'>
        {/* Load trigger for infinite scroll */}
        {hasMore && (
          <div ref={loadTriggerRef} className='flex justify-center py-4'>
            {isLoadingOlder && (
              <div className='flex items-center gap-2 text-muted-foreground text-sm'>
                <Loader2 className='h-4 w-4 animate-spin' />
                <span>Loading older messages...</span>
              </div>
            )}
          </div>
        )}

        {messages.map((message, index) => (
          <div key={message.id}>
            {shouldShowDateDivider(index) && (
              <div className='flex items-center justify-center my-4'>
                <div className='bg-muted text-muted-foreground text-xs px-3 py-1 rounded-full'>
                  {formatChatDateDivider(message.createdAt)}
                </div>
              </div>
            )}
            <div
              className={cn(
                'flex gap-2 group items-center',
                message.isOwn && 'justify-end',
                getMessageSpacing(index),
              )}
            >
              {message.isOwn && !message.deleted && (
                <MessageActions
                  messageId={message.id}
                  isOwn={true}
                  align='end'
                  onCopy={() => handleCopyMessage(message.content)}
                  onReply={() => handleReply(message)}
                  messageContent={message.content}
                />
              )}

              {
                <>
                  {/* Reaction picker for own messages (left side) */}
                  {message.isOwn && !message.deleted && (
                    <ReactionPicker
                      currentReaction={
                        message.reactions.find((r) => r.hasReacted)?.emoji ||
                        null
                      }
                      onSelectEmoji={(emoji) =>
                        handleToggleReaction(message.id, emoji)
                      }
                      isOwnMessage={true}
                    />
                  )}

                  <div
                    className={cn(
                      'relative max-w-[40%] px-4 py-2',
                      message.isOwn
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-primary/10',
                      getMessageRadius(index),
                    )}
                  >
                    {message.deleted ? (
                      <p className='text-sm leading-relaxed italic opacity-60 text-primary-foreground'>
                        This message was deleted
                      </p>
                    ) : (
                      <>
                        {message.replyTo && (
                          <MessageReplyQuote
                            authorName={
                              message.replyTo.author?.displayName ||
                              message.replyTo.author?.firstName ||
                              message.replyTo.author?.lastName ||
                              'Unknown User'
                            }
                            content={message.replyTo.content}
                            isOwnMessage={message.isOwn}
                          />
                        )}
                        <p
                          className={cn(
                            'text-sm leading-relaxed',
                            message.isOwn
                              ? 'text-primary-foreground text-right'
                              : 'text-left',
                          )}
                        >
                          {message.content}
                        </p>
                        <div
                          className={cn(
                            'mt-1 flex items-center gap-1',
                            message.isOwn ? 'justify-end' : 'justify-start',
                          )}
                        >
                          {message.edited && (
                            <span className='text-xs opacity-60'>(edited)</span>
                          )}
                          <span className='text-xs opacity-70'>
                            {formatMessageTime(
                              message.createdAt instanceof Date
                                ? message.createdAt.toISOString()
                                : message.createdAt,
                            )}
                          </span>
                          {/* Read receipt tick for own messages — mirrors OLD
                              (chat-messages.tsx: CheckCheck when seen, Check
                              when only delivered). Updates live via the `read`
                              WS event. */}
                          {message.isOwn && !message.deleted && (
                            message.isRead ? (
                              <CheckCheck className='h-3 w-3 opacity-70' />
                            ) : (
                              <Check className='h-3 w-3 opacity-70' />
                            )
                          )}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Reaction picker for other messages (right side) */}
                  {!message.isOwn && !message.deleted && (
                    <ReactionPicker
                      currentReaction={
                        message.reactions.find((r) => r.hasReacted)?.emoji ||
                        null
                      }
                      onSelectEmoji={(emoji) =>
                        handleToggleReaction(message.id, emoji)
                      }
                      isOwnMessage={false}
                    />
                  )}
                </>
              }

              {!message.isOwn && !message.deleted && (
                <MessageActions
                  messageId={message.id}
                  isOwn={false}
                  align='start'
                  onReply={() => handleReply(message)}
                  onCopy={() => handleCopyMessage(message.content)}
                  messageContent={message.content}
                />
              )}
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
