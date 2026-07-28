'use client';

import { useState } from 'react';
import { revokeAllUserSessions } from '@/actions/admin';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Loader2, LogOut } from 'lucide-react';
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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface RevokeSessionsFormProps {
  user: {
    id: string;
    email: string;
  };
}

export function RevokeSessionsForm({ user }: RevokeSessionsFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  async function handleRevokeAllSessions() {
    setIsLoading(true);

    try {
      const result = await revokeAllUserSessions({
        userId: user.id,
      });

      if (result.success) {
        toast.success('All user sessions have been revoked successfully');
        router.refresh();
      } else {
        toast.error(result.error || 'Failed to revoke sessions');
      }
    } catch (error) {
      console.error('Error revoking sessions:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className='space-y-4'>
      <div className='rounded-lg border p-4'>
        <div className='space-y-2'>
          <h3 className='text-sm font-medium'>Session Management</h3>
          <p className='text-sm text-muted-foreground'>
            Revoke all active sessions for this user. This will force the user
            to log in again on all devices.
          </p>
        </div>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              type='button'
              variant='destructive'
              className='mt-4'
              disabled={isLoading}
            >
              {isLoading && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
              <LogOut className='mr-2 h-4 w-4' />
              Revoke All Sessions
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Revoke All Sessions</AlertDialogTitle>
              <AlertDialogDescription>
                This will immediately log out the user from all devices and
                sessions. The user will need to log in again to access their
                account. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleRevokeAllSessions}>
                Revoke All Sessions
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <p className='text-xs text-muted-foreground'>
        Note: This action will not ban or block the user. They can log in again
        immediately after their sessions are revoked.
      </p>
    </div>
  );
}
