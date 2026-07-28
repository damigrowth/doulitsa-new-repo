/**
 * Client Component: Reply Preview Banner
 * Shows preview of message being replied to with cancel option
 */

'use client';

import { Button } from '@/components/ui/button';
import { X, CornerDownRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MessageReplyPreviewProps {
  authorName: string;
  content: string;
  isOwn: boolean;
  onCancel: () => void;
}

export function MessageReplyPreview({
  authorName,
  content,
  isOwn,
  onCancel,
}: MessageReplyPreviewProps) {
  // Truncate long messages
  const displayContent = content.length > 100 ? content.slice(0, 100) + '...' : content;

  return (
    <div className='px-4 py-2 bg-muted/50 border-l-4 border-primary'>
      <div className='flex items-start justify-between gap-2'>
        <div className='flex-1 min-w-0'>
          <div className='flex items-center gap-2 mb-1'>
            <CornerDownRight className='h-3 w-3 text-muted-foreground flex-shrink-0' />
            <p className='text-xs font-medium text-primary'>
              Απάντηση {isOwn ? 'στον εαυτό σου' : `σε ${authorName}`}
            </p>
          </div>
          <p className='text-sm text-muted-foreground truncate pl-5'>
            {displayContent}
          </p>
        </div>
        <Button
          size='icon'
          variant='ghost'
          className='h-6 w-6 flex-shrink-0'
          onClick={onCancel}
        >
          <X className='h-4 w-4' />
        </Button>
      </div>
    </div>
  );
}
