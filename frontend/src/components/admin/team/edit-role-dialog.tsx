'use client';

import { useState, useEffect } from 'react';
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
import { PencilIcon } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { assignAdminRole, type TeamMember } from '@/actions/admin/users';
import { ALL_ROLES_DISPLAY_INFO, USER_ROLES, type UserRole } from '@/lib/auth/roles';
import { useRouter } from 'next/navigation';

interface EditRoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: TeamMember | null;
}

export function EditRoleDialog({ open, onOpenChange, member }: EditRoleDialogProps) {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<UserRole | ''>('');
  const [assigning, setAssigning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pre-populate role when member changes
  useEffect(() => {
    if (member) {
      // Check if member.role is a valid UserRole
      const userRoleValues = Object.values(USER_ROLES);
      if (userRoleValues.includes(member.role as any)) {
        setSelectedRole(member.role as UserRole);
      } else {
        setSelectedRole('');
      }
    } else {
      setSelectedRole('');
    }
  }, [member]);

  const handleUpdateRole = async () => {
    if (!member || !selectedRole) {
      setError('Please select a role');
      return;
    }

    setAssigning(true);
    setError(null);

    const result = await assignAdminRole(member.id, selectedRole);

    if (result.success) {
      // Close dialog
      onOpenChange(false);

      // Refresh page
      router.refresh();
    } else {
      setError(result.error || 'Failed to update role');
    }

    setAssigning(false);
  };

  if (!member) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[500px]'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            <PencilIcon className='h-5 w-5' />
            Edit Team Member
          </DialogTitle>
          <DialogDescription>
            Update the admin role for this team member
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-4 py-4'>
          {/* Selected User Display */}
          <div className='space-y-2'>
            <Label>Team Member</Label>
            <div className='flex items-center gap-3 p-3 border rounded-md bg-muted/50'>
              <Avatar className='h-10 w-10'>
                <AvatarImage src={member.image || ''} />
                <AvatarFallback>
                  {(member.displayName?.[0] || member.username?.[0] || 'U').toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className='flex-1 min-w-0'>
                <p className='text-sm font-medium truncate'>
                  {member.displayName || member.username || 'No name'}
                </p>
                <p className='text-xs text-muted-foreground truncate'>
                  {member.email}
                </p>
              </div>
            </div>
          </div>

          {/* Role Selection */}
          <div className='space-y-2'>
            <Label htmlFor='role'>User Role</Label>
            <Select
              value={selectedRole}
              onValueChange={(value) => setSelectedRole(value as UserRole)}
            >
              <SelectTrigger id='role'>
                <SelectValue placeholder='Select a role' />
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

          {/* Error Message */}
          {error && (
            <div className='rounded-md bg-destructive/15 p-3 text-sm text-destructive'>
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant='outline'
            onClick={() => onOpenChange(false)}
            disabled={assigning}
          >
            Cancel
          </Button>
          <Button
            onClick={handleUpdateRole}
            disabled={!selectedRole || assigning}
          >
            {assigning ? 'Updating...' : 'Update Role'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
