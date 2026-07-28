'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { UserPlusIcon } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ServerSearchCombobox } from '@/components/ui/server-search-combobox';
import { searchUsersForRoleAssignment, assignAdminRole, type TeamMember } from '@/actions/admin/users';
import { ALL_ROLES_DISPLAY_INFO, type UserRole } from '@/lib/auth/roles';
import { useRouter } from 'next/navigation';

interface AssignRoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AssignRoleDialog({ open, onOpenChange }: AssignRoleDialogProps) {
  const router = useRouter();
  const [selectedUser, setSelectedUser] = useState<TeamMember | null>(null);
  const [selectedRole, setSelectedRole] = useState<UserRole | ''>('');
  const [assigning, setAssigning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAssignRole = async () => {
    if (!selectedUser || !selectedRole) {
      setError('Please select a user and role');
      return;
    }

    setAssigning(true);
    setError(null);

    const result = await assignAdminRole(selectedUser.id, selectedRole);

    if (result.success) {
      // Reset form
      setSelectedUser(null);
      setSelectedRole('');

      // Close dialog
      onOpenChange(false);

      // Refresh page
      router.refresh();
    } else {
      setError(result.error || 'Failed to assign role');
    }

    setAssigning(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[600px]'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            <UserPlusIcon className='h-5 w-5' />
            Add Team Member
          </DialogTitle>
          <DialogDescription>
            Search for a user and assign them to the team with an admin role
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-4 py-4'>
          {/* Search Users */}
          <div className='space-y-2'>
            <Label>Search User</Label>
            <ServerSearchCombobox<TeamMember>
              value={selectedUser}
              onSelect={setSelectedUser}
              onSearch={async (query) => {
                const result = await searchUsersForRoleAssignment(query);
                return result.success && result.data ? result.data : [];
              }}
              getLabel={(user) =>
                user.displayName || user.username || user.email || 'Unknown'
              }
              getKey={(user) => user.id}
              renderSelected={(user) => (
                <div className='flex items-center gap-3'>
                  <Avatar className='h-8 w-8'>
                    <AvatarImage src={user.image || ''} />
                    <AvatarFallback>
                      {(user.displayName?.[0] || user.username?.[0] || 'U').toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className='flex flex-col'>
                    <p className='text-sm font-medium'>
                      {user.displayName || user.username || 'No name'}
                    </p>
                    <p className='text-xs text-muted-foreground'>
                      {user.email || ''}
                    </p>
                  </div>
                </div>
              )}
              renderItem={(user) => (
                <div className='flex items-center gap-3'>
                  <Avatar className='h-8 w-8'>
                    <AvatarImage src={user.image || ''} />
                    <AvatarFallback>
                      {(user.displayName?.[0] || user.username?.[0] || 'U').toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className='flex-1 min-w-0'>
                    <p className='text-sm font-medium truncate'>
                      {user.displayName || user.username || 'No name'}
                    </p>
                    <p className='text-xs text-muted-foreground truncate'>
                      {user.email || ''}
                    </p>
                  </div>
                </div>
              )}
              placeholder='Search by email or username...'
              emptyMessage='No users found'
              clearable
            />
          </div>

          {/* Role Selection */}
          {selectedUser && (
            <div className='space-y-2'>
              <Label>Select Role</Label>
              <Select value={selectedRole} onValueChange={(value) => setSelectedRole(value as UserRole)}>
                <SelectTrigger>
                  <SelectValue placeholder='Choose a role' />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ALL_ROLES_DISPLAY_INFO).map(([role, info]) => (
                    <SelectItem key={role} value={role}>
                      <span className='font-medium'>{info.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {/* Show description for selected role */}
              {selectedRole && ALL_ROLES_DISPLAY_INFO[selectedRole] && (
                <p className='text-sm text-muted-foreground'>
                  {ALL_ROLES_DISPLAY_INFO[selectedRole].description}
                </p>
              )}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className='rounded-md bg-destructive/15 p-3 text-sm text-destructive'>
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleAssignRole}
            disabled={!selectedUser || !selectedRole || assigning}
          >
            {assigning ? 'Assigning...' : 'Assign Role'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
