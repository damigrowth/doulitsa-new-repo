'use client';

import { useTransition } from 'react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { cancelSubscription } from '@/actions/subscription';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

/**
 * Self-contained "Ακύρωση Συνδρομής" button + confirmation dialog.
 * Rendered in the promoted plan card footer for active subscribers.
 */
export default function CancelSubscriptionButton() {
  const [isPending, startTransition] = useTransition();

  const handleCancel = () => {
    startTransition(async () => {
      const result = await cancelSubscription(true);
      if (result.success) {
        toast.success('Η συνδρομή θα ακυρωθεί στο τέλος της τρέχουσας περιόδου');
      } else {
        toast.error(result.error || 'Κάτι πήγε στραβά');
      }
    });
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant='outline'
          disabled={isPending}
          className='w-full sm:w-auto'
        >
          {isPending ? (
            <Loader2 className='size-4 animate-spin' />
          ) : (
            'Ακύρωση Συνδρομής'
          )}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Ακύρωση Συνδρομής</AlertDialogTitle>
          <AlertDialogDescription>
            Είσαι σίγουρος/η ότι θέλεις να ακυρώσεις τη συνδρομή σου; Θα
            διατηρήσεις πρόσβαση στις δυνατότητες έως το τέλος της τρέχουσας
            περιόδου χρέωσης.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Άκυρο</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleCancel}
            className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
          >
            Ακύρωση Συνδρομής
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
