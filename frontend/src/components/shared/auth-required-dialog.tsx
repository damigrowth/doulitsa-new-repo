'use client';

import { useRouter } from 'next/navigation';
import { UserRound } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface AuthRequiredDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Contextual title, e.g. 'Για να επικοινωνήσεις πρέπει να έχεις λογαριασμό' */
  title?: string;
}

/**
 * Branded login/register prompt shown when a guest tries an action
 * that requires an account (contact, save to favorites, etc.).
 */
export default function AuthRequiredDialog({
  open,
  onOpenChange,
  title = 'Για να συνεχίσεις πρέπει να έχεις λογαριασμό',
}: AuthRequiredDialogProps) {
  const router = useRouter();

  const navigate = (path: string) => {
    onOpenChange(false);
    router.push(path);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-md gap-0 rounded-2xl sm:rounded-3xl border-gray-100 p-8 sm:p-10 shadow-2xl'>
        <DialogHeader className='space-y-0 text-center sm:text-center'>
          <div className='mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-fifth ring-1 ring-fourth/20'>
            <UserRound className='h-8 w-8 text-third' />
          </div>
          <DialogTitle className='text-center text-xl font-bold leading-snug text-dark'>
            {title}
          </DialogTitle>
          <DialogDescription className='sr-only'>
            Συνδέσου ή κάνε εγγραφή για να συνεχίσεις
          </DialogDescription>
        </DialogHeader>

        <div className='mt-8 grid grid-cols-2 gap-3'>
          <Button
            type='button'
            variant='outline'
            size='lg'
            className='h-11 rounded-full border-gray-200 hover:border-third hover:bg-fifth hover:text-third transition-colors'
            onClick={() => navigate('/login')}
          >
            Σύνδεση
          </Button>
          <Button
            type='button'
            size='lg'
            className='h-11 rounded-full bg-secondary text-secondary-foreground hover:bg-fourth transition-colors'
            onClick={() => navigate('/register')}
          >
            Εγγραφή
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
