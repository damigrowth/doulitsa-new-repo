'use client';

import { useState } from 'react';
import {
  ChangePasswordForm,
  ChangeUsernameForm,
  DeleteAccountForm,
  UpgradeToProForm,
} from '@/components';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Key, Trash2, AtSign, ArrowUpCircle } from 'lucide-react';
import { AuthUser } from '@/lib/types/auth';

interface AccountPageActionsProps {
  user: AuthUser | null;
}

export default function AccountPageActions({ user }: AccountPageActionsProps) {
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [changeUsernameOpen, setChangeUsernameOpen] = useState(false);
  const [upgradeToProOpen, setUpgradeToProOpen] = useState(false);
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);

  return (
    <div className='flex flex-col sm:flex-row gap-4'>
      {/* Change Password Button - Only for email provider users */}
      {user?.provider === 'email' && (
        <Dialog open={changePasswordOpen} onOpenChange={setChangePasswordOpen}>
          <DialogTrigger asChild>
            <Button variant='outline' className='flex items-center gap-2'>
              <Key className='h-4 w-4' />
              Αλλαγή Κωδικού
            </Button>
          </DialogTrigger>
          <DialogContent className='sm:max-w-md'>
            <ChangePasswordForm
              onSuccess={() => setChangePasswordOpen(false)}
              onCancel={() => setChangePasswordOpen(false)}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Change Username Button - Only for pro users */}
      {user?.type === 'pro' && (
        <Dialog open={changeUsernameOpen} onOpenChange={setChangeUsernameOpen}>
          <DialogTrigger asChild>
            <Button variant='outline' className='flex items-center gap-2'>
              <AtSign className='h-4 w-4' />
              Αλλαγή Username
            </Button>
          </DialogTrigger>
          <DialogContent className='sm:max-w-md'>
            <ChangeUsernameForm
              user={user}
              onSuccess={() => setChangeUsernameOpen(false)}
              onCancel={() => setChangeUsernameOpen(false)}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Upgrade to Pro Button - Only for simple users */}
      {user?.type === 'user' && (
        <Dialog open={upgradeToProOpen} onOpenChange={setUpgradeToProOpen}>
          <DialogTrigger asChild>
            <Button variant='outline' className='flex items-center gap-2'>
              <ArrowUpCircle className='h-4 w-4' />
              Αλλαγή σε Επαγγελματικό Λογαριασμό
            </Button>
          </DialogTrigger>
          <DialogContent className='sm:max-w-md'>
            <UpgradeToProForm
              user={user}
              onSuccess={() => setUpgradeToProOpen(false)}
              onCancel={() => setUpgradeToProOpen(false)}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Account Button */}
      <Dialog open={deleteAccountOpen} onOpenChange={setDeleteAccountOpen}>
        <DialogTrigger asChild>
          <Button
            variant='outline'
            className='flex items-center gap-2 bg-white text-muted-foreground hover:bg-gray-50 hover:text-muted-foreground/80 border-muted transition-all'
          >
            <Trash2 className='h-4 w-4' />
            Διαγραφή Λογαριασμού
          </Button>
        </DialogTrigger>
        <DialogContent className='sm:max-w-md'>
          <DeleteAccountForm
            user={user}
            onSuccess={() => setDeleteAccountOpen(false)}
            onCancel={() => setDeleteAccountOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
