/**
 * Client Component: Message Edit Mode
 * Inline message editing with save/cancel actions
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { editMessage } from '@/actions/messages/messages';

interface MessageEditProps {
  messageId: string;
  initialContent: string;
  userId: string;
  onSave: () => void;
  onCancel: () => void;
  className?: string;
}

export function MessageEdit({
  messageId,
  initialContent,
  userId,
  onSave,
  onCancel,
  className,
}: MessageEditProps) {
  const [content, setContent] = useState(initialContent);
  const [isLoading, setIsLoading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-focus textarea on mount
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
      // Set cursor to end
      textareaRef.current.selectionStart = content.length;
      textareaRef.current.selectionEnd = content.length;
    }
  }, []);

  const handleSave = async () => {
    const trimmedContent = content.trim();

    // Validation
    if (!trimmedContent) {
      toast.error('Message cannot be empty');
      return;
    }

    if (trimmedContent === initialContent.trim()) {
      // No changes made
      onCancel();
      return;
    }

    if (trimmedContent.length > 5000) {
      toast.error('Message is too long (max 5000 characters)');
      return;
    }

    setIsLoading(true);
    try {
      await editMessage(messageId, trimmedContent, userId);
      toast.success('Message updated');
      onSave();
    } catch (error) {
      console.error('Failed to edit message:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update message');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Save on Ctrl/Cmd + Enter
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSave();
    }
    // Cancel on Escape
    if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <Textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={isLoading}
        className='min-h-[80px] resize-none text-sm'
        placeholder='Επεξεργασία μηνύματος...'
      />
      <div className='flex items-center justify-end gap-2'>
        <Button
          type='button'
          size='sm'
          variant='ghost'
          onClick={onCancel}
          disabled={isLoading}
        >
          <X className='h-4 w-4 mr-1' />
          Cancel
        </Button>
        <Button
          type='button'
          size='sm'
          onClick={handleSave}
          disabled={isLoading}
        >
          <Check className='h-4 w-4 mr-1' />
          {isLoading ? 'Saving...' : 'Save'}
        </Button>
      </div>
      <p className='text-xs text-muted-foreground'>
        Press <kbd className='px-1 rounded bg-muted'>Ctrl+Enter</kbd> to save,{' '}
        <kbd className='px-1 rounded bg-muted'>Esc</kbd> to cancel
      </p>
    </div>
  );
}
