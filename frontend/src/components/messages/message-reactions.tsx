'use client';

import { cn } from '@/lib/utils';
import type { MessageReaction } from '@/lib/types/messages';

interface MessageReactionsProps {
  reactions: MessageReaction[];
  messageId: string;
  currentUserId: string;
  isOwnMessage: boolean;
  onToggleReaction: (emoji: string) => void;
}

export function MessageReactions({
  reactions,
  messageId,
  currentUserId,
  isOwnMessage,
  onToggleReaction,
}: MessageReactionsProps) {
  if (!reactions || reactions.length === 0) {
    return null;
  }

  return (
    <div className='mt-1 flex flex-wrap gap-1'>
      {reactions.map((reaction) => (
        <button
          key={reaction.emoji}
          onClick={() => onToggleReaction(reaction.emoji)}
          className={cn(
            'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs transition-colors',
            reaction.hasReacted
              ? isOwnMessage
                ? 'bg-primary/20 text-primary-foreground ring-1 ring-primary/30'
                : 'bg-primary/20 text-primary ring-1 ring-primary/30'
              : isOwnMessage
                ? 'bg-primary-foreground/10 text-primary-foreground/70 hover:bg-primary-foreground/20'
                : 'bg-muted hover:bg-muted/80'
          )}
          title={`${reaction.count} reaction${reaction.count > 1 ? 's' : ''}`}
        >
          <span>{reaction.emoji}</span>
          <span className='font-medium'>{reaction.count}</span>
        </button>
      ))}
    </div>
  );
}
