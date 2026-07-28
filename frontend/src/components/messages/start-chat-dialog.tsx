'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, MessageCircle, Send } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { getOrCreateChat, sendMessage } from '@/actions/messages';
import { useSession } from '@/lib/auth/client';
import AuthRequiredDialog from '@/components/shared/auth-required-dialog';

interface StartChatDialogProps {
  recipientId: string;
  recipientName: string;
  initialMessage?: string;
  customTrigger?: string;
  currentUserId?: string; // Optional: can be passed from server component
  className?: string;
}

export function StartChatDialog({
  recipientId,
  recipientName,
  initialMessage,
  customTrigger,
  currentUserId: propCurrentUserId,
  className,
}: StartChatDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSelfMessageError, setShowSelfMessageError] = useState(false);

  // Load initial message when dialog opens
  useEffect(() => {
    if (open && initialMessage) {
      setMessage(initialMessage);
    }
  }, [open, initialMessage]);

  // Get session from better-auth client
  const { data: session, isPending } = useSession();

  // Use prop if provided, otherwise get from session
  const currentUserId = propCurrentUserId || session?.user?.id;

  // Check if user is logged in
  const isLoggedIn = !!currentUserId;

  // Handle dialog open state changes
  const handleOpenChange = (newOpen: boolean) => {
    // If trying to open the dialog, validate first
    if (newOpen && currentUserId && currentUserId === recipientId) {
      setShowSelfMessageError(true);
      return; // Don't open the dialog
    }
    // Clear error when closing
    if (!newOpen) {
      setShowSelfMessageError(false);
    }
    // Otherwise, allow the dialog state to change
    setOpen(newOpen);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Double-check that we have currentUserId
    if (!currentUserId) {
      toast.error('Πρέπει να συνδεθείτε πρώτα');
      return;
    }

    if (!message.trim()) {
      toast.error('Παρακαλώ γράψτε ένα μήνυμα');
      return;
    }

    setIsLoading(true);

    try {
      // Get or create chat with the recipient
      const { chatId } = await getOrCreateChat(currentUserId, recipientId);

      // Send the initial message
      await sendMessage(chatId, message.trim(), currentUserId);

      // Success! Close dialog and redirect to chat
      toast.success('Το μήνυμα στάλθηκε επιτυχώς');
      setOpen(false);
      setMessage('');

      // Redirect to messages page with the chat selected
      router.push(`/dashboard/messages?chatId=${chatId}`);
    } catch (error) {
      console.error('Start chat error:', error);
      toast.error('Κάτι πήγε στραβά. Παρακαλώ δοκιμάστε ξανά.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isLoggedIn) {
    return (
      <div className='space-y-2'>
        <Button
          className={`bg-secondary text-secondary-foreground hover:bg-fourth transition-colors ${className || 'w-full'}`}
          size='lg'
          type='button'
          onClick={() => setOpen(true)}
        >
          {customTrigger || 'Επικοινωνία'}
          {!customTrigger && <MessageCircle className='h-4 w-4' />}
        </Button>
        <AuthRequiredDialog
          open={open}
          onOpenChange={setOpen}
          title='Για να επικοινωνήσεις πρέπει να έχεις λογαριασμό'
        />
      </div>
    );
  }

  return (
    <div className='space-y-2'>
      {showSelfMessageError && (
        <p className='text-center text-sm text-destructive'>
          Δεν μπορείς να στείλεις μήνυμα στον εαυτό σου
        </p>
      )}

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>
          <Button
            className={`bg-secondary text-secondary-foreground hover:bg-fourth transition-colors ${className || 'w-full'}`}
            size='lg'
            type='button'
          >
            {customTrigger || 'Επικοινωνία'}
            {!customTrigger && <MessageCircle className='h-4 w-4' />}
          </Button>
        </DialogTrigger>
        <DialogContent className='sm:max-w-base'>
          <DialogHeader>
            <DialogTitle className='flex items-center gap-2'>
              <MessageCircle className='h-5 w-5 text-primary' />
              {`Νέο Μήνυμα προς ${recipientName}`}
            </DialogTitle>
            <DialogDescription className='sr-only'>
              {`Στείλτε μήνυμα στον χρήστη ${recipientName}`}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className='space-y-4'>
            <div className='space-y-2'>
              <Textarea
                id='message'
                placeholder='Πληκτρολόγησε εδώ το μήνυμα...'
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={5}
                disabled={isLoading}
                className='resize-none'
              />
            </div>
            <div className='flex gap-2 justify-end'>
              <Button
                type='button'
                variant='outline'
                onClick={() => setOpen(false)}
                disabled={isLoading}
              >
                Ακύρωση
              </Button>
              <Button type='submit' disabled={isLoading || !message.trim()}>
                {isLoading ? (
                  <>
                    <Loader2 className='h-4 w-4 animate-spin' />
                    Αποστολή...
                  </>
                ) : (
                  <>
                    Αποστολή
                    <Send className='h-4 w-4' />
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
