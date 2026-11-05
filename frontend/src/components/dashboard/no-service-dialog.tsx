'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { NextLink } from '@/components';

const STORAGE_KEY = 'no-service-dialog-dismissed';

interface NoServiceDialogProps {
  /**
   * Stable per-login key. OLD keyed on the better-auth session id, which lives
   * for the whole login. Django's session.id is the ACCESS-token jti (rotates
   * every 15 min), which made the dialog reappear every ~15 min. We key on the
   * user id instead and clear the flag on sign-out (lib/auth/client.ts), which
   * restores "once per login session per tab".
   */
  sessionId?: string;
}

export default function NoServiceDialog({ sessionId }: NoServiceDialogProps) {
  const [open, setOpen] = useState(false);

  const storageKey = sessionId ? `${STORAGE_KEY}-${sessionId}` : STORAGE_KEY;

  useEffect(() => {
    const dismissed = sessionStorage.getItem(storageKey);
    if (!dismissed) {
      setOpen(true);
    }
  }, [storageKey]);

  const handleDismiss = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      sessionStorage.setItem(storageKey, '1');
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleDismiss}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>Συγχαρητήρια! Δημιούργησε την πρώτη σου υπηρεσία!</DialogTitle>
          <DialogDescription>
            Πρόσθεσε μια υπηρεσία για να σε βρουν οι χρήστες της πλατφόρμας.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className='sm:justify-start'>
          <Button asChild>
            <NextLink href='/dashboard/services/create'>
              <Plus className='mr-2 h-4 w-4' />
              Προσθήκη Υπηρεσίας
            </NextLink>
          </Button>
          <Button variant='ghost' onClick={() => handleDismiss(false)}>
            Αργότερα
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
