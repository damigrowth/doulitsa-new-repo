/**
 * Client Component: Service Delete Confirmation Dialog
 * Shows confirmation before deleting a service
 * Works for both user and admin contexts
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { deleteService as deleteServiceUser } from '@/actions/services/delete-service';
import { deleteService as deleteServiceAdmin } from '@/actions/admin/services';
import { AlertTriangle } from 'lucide-react';

interface ServiceDeleteDialogProps {
  serviceId: number;
  serviceTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted?: () => void;
  isAdmin?: boolean;
  redirectPath?: string;
}

export function ServiceDeleteDialog({
  serviceId,
  serviceTitle,
  open,
  onOpenChange,
  onDeleted,
  isAdmin = false,
  redirectPath,
}: ServiceDeleteDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    setIsLoading(true);
    try {
      // Call appropriate delete action based on context
      const result = isAdmin
        ? await deleteServiceAdmin({ serviceId })
        : await deleteServiceUser({ serviceId });

      if (!result.success) {
        throw new Error(result.error || 'Failed to delete service');
      }

      toast.success('Η υπηρεσία διαγράφηκε επιτυχώς');
      onOpenChange(false);

      // Call callback if provided
      onDeleted?.();

      // Redirect after a short delay to allow toast to show
      setTimeout(() => {
        if (redirectPath) {
          router.push(redirectPath);
        } else {
          // Default redirect based on context
          router.push(isAdmin ? '/admin/services' : '/dashboard/services');
        }
        router.refresh();
      }, 500);
    } catch (error) {
      console.error('Failed to delete service:', error);
      toast.error(
        error instanceof Error ? error.message : 'Αποτυχία διαγραφής υπηρεσίας',
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className='flex items-center gap-1.5'>
            <AlertTriangle size={20} className='text-destructive' />
            <span>Διαγραφή υπηρεσίας</span>
          </AlertDialogTitle>
          <AlertDialogDescription>
            Είστε σίγουροι ότι θέλετε να διαγράψετε την υπηρεσία{' '}
            <strong className='text-foreground'>
              &ldquo;{serviceTitle}&rdquo;
            </strong>
            ;
            <br />
            <br />
            Αυτή η ενέργεια δεν μπορεί να αντιστραφεί και όλα τα δεδομένα θα
            διαγραφούν.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Ακύρωση</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleDelete();
            }}
            disabled={isLoading}
            className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
          >
            {isLoading ? 'Διαγραφή...' : 'Διαγραφή'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
