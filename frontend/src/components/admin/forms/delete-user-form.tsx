'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Trash2, AlertTriangle } from 'lucide-react';
import { removeUser } from '@/actions/admin/users';

interface DeleteUserFormProps {
  user: {
    id: string;
    email: string;
    username?: string | null;
    displayName?: string | null;
  };
}

export function DeleteUserForm({ user }: DeleteUserFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usernameConfirm, setUsernameConfirm] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate username confirmation
    if (usernameConfirm !== user.username) {
      setError('Username does not match. Please try again.');
      return;
    }

    setIsLoading(true);

    try {
      const result = await removeUser({ userId: user.id });

      if (!result.success) {
        setError(result.error || 'Failed to delete user');
        setIsLoading(false);
        return;
      }

      // Redirect to users list after successful deletion
      router.push('/admin/users?deleted=true');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className='space-y-4'>
      {/* Warning Alert */}
      <Alert variant='destructive'>
        <AlertTriangle className='h-4 w-4' />
        <AlertDescription className='space-y-2'>
          <p className='font-semibold'>This action is irreversible!</p>
          <p className='text-sm'>Deleting this user will permanently remove:</p>
          <ul className='list-disc list-inside text-sm space-y-1 ml-2'>
            <li>User account and authentication data</li>
            <li>Profile information (if exists)</li>
            <li>All services created by this user</li>
            <li>All messages and chat history</li>
            <li>All reviews and ratings</li>
            <li>Email address from Brevo email lists (GDPR compliance)</li>
            <li>All other associated data</li>
          </ul>
        </AlertDescription>
      </Alert>

      {/* User Information */}
      <div className='rounded-lg border p-4 bg-muted/50 space-y-2'>
        <div className='flex items-center justify-between'>
          <span className='text-sm font-medium'>Email:</span>
          <span className='text-sm'>{user.email}</span>
        </div>
        <div className='flex items-center justify-between'>
          <span className='text-sm font-medium'>Display Name:</span>
          <span className='text-sm'>{user.displayName || '-'}</span>
        </div>
        <div className='flex items-center justify-between'>
          <span className='text-sm font-medium'>Username:</span>
          <span className='text-sm font-mono'>{user.username || '-'}</span>
        </div>
      </div>

      {/* Username Confirmation */}
      <div className='space-y-2'>
        <Label htmlFor='usernameConfirm' className='text-sm'>
          Type <span className='font-mono font-semibold'>{user.username}</span> to
          confirm deletion
        </Label>
        <Input
          id='usernameConfirm'
          type='text'
          value={usernameConfirm}
          onChange={(e) => setUsernameConfirm(e.target.value)}
          placeholder={user.username || 'username'}
          disabled={isLoading}
          className='font-mono'
          autoComplete='off'
        />
      </div>

      {/* Error Message */}
      {error && (
        <Alert variant='destructive'>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Submit Button */}
      <div className='flex items-center gap-3 pt-2'>
        <Button
          type='submit'
          variant='destructive'
          disabled={isLoading || usernameConfirm !== user.username}
          className='w-full'
        >
          {isLoading ? (
            <>
              <Loader2 className='mr-2 h-4 w-4 animate-spin' />
              Deleting User...
            </>
          ) : (
            <>
              <Trash2 className='mr-2 h-4 w-4' />
              Delete User Permanently
            </>
          )}
        </Button>
      </div>

      {/* Additional Warning */}
      <p className='text-xs text-muted-foreground text-center'>
        This will also remove the user's email from all Brevo email lists for GDPR
        compliance.
      </p>
    </form>
  );
}
