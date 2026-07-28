'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { UserPlusIcon } from 'lucide-react';
import { AssignRoleDialog } from './assign-role-dialog';

export function TeamManagementClient() {
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);

  return (
    <>
      <Button
        size='sm'
        className='gap-0'
        onClick={() => setAssignDialogOpen(true)}
      >
        <UserPlusIcon className='mr-2 h-4 w-4' />
        Add Team Member
      </Button>

      <AssignRoleDialog
        open={assignDialogOpen}
        onOpenChange={setAssignDialogOpen}
      />
    </>
  );
}
