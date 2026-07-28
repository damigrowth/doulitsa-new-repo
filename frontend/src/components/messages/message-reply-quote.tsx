/**
 * Client Component: Message Reply Quote
 * Shows quoted message within a chat message (when replying)
 */

'use client';

import { cn } from '@/lib/utils';

interface MessageReplyQuoteProps {
  authorName: string;
  content: string;
  isOwnMessage: boolean; // The main message is from the current user
}

export function MessageReplyQuote({
  authorName,
  content,
  isOwnMessage,
}: MessageReplyQuoteProps) {
  // Truncate long quoted messages
  const displayContent = content.length > 80 ? content.slice(0, 80) + '...' : content;

  return (
    <div
      className={cn(
        'mb-2 border-l-2 pl-2 py-1',
        isOwnMessage
          ? 'border-primary-foreground/40'
          : 'border-primary/40'
      )}
    >
      <p
        className={cn(
          'text-xs font-medium mb-0.5',
          isOwnMessage
            ? 'text-primary-foreground/80'
            : 'text-primary/80'
        )}
      >
        {authorName}
      </p>
      <p
        className={cn(
          'text-xs opacity-70 line-clamp-2',
          isOwnMessage
            ? 'text-primary-foreground'
            : 'text-foreground'
        )}
      >
        {displayContent}
      </p>
    </div>
  );
}
