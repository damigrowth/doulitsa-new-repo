'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  MailIcon,
  Calendar,
  ExternalLink,
  Pencil,
} from 'lucide-react';
import UserAvatar from '@/components/shared/user-avatar';
import { EditRoleDialog } from './edit-role-dialog';
import { formatDateTime } from '@/lib/utils/date';
import { ADMIN_ROLES } from '@/lib/auth/roles';
import type { TeamMember } from '@/actions/admin/users';

interface TeamCardsClientProps {
  teamMembers: TeamMember[];
}

// Helper to get role display name
const getRoleDisplayName = (role: string) => {
  if (role === ADMIN_ROLES.ADMIN) return 'Admin';
  if (role === ADMIN_ROLES.SUPPORT) return 'Support';
  if (role === ADMIN_ROLES.EDITOR) return 'Editor';
  return role;
};

export function TeamCardsClient({ teamMembers }: TeamCardsClientProps) {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);

  const handleEditClick = (member: TeamMember) => {
    setSelectedMember(member);
    setEditDialogOpen(true);
  };

  return (
    <>
      <div className='grid gap-6 md:grid-cols-2 lg:grid-cols-3'>
        {teamMembers.map((member) => (
          <Card key={member.id} className="relative">
            <CardHeader className='pb-3'>
              <div className='flex items-start justify-between'>
                <div className='flex items-center space-x-3'>
                  <UserAvatar
                    displayName={member.displayName}
                    image={member.image}
                    size='md'
                    className='h-12 w-12'
                    showBorder={false}
                    showShadow={false}
                  />
                  <div>
                    <div className='flex items-center gap-2'>
                      <div className="space-y-0.5">
                        <CardTitle className='text-base'>
                          {member.displayName || 'No name'}
                        </CardTitle>
                        {member.username && (
                          <p className='text-xs text-muted-foreground'>
                            @{member.username}
                          </p>
                        )}
                      </div>
                    </div>
                    <p className='text-sm text-muted-foreground mt-1'>
                      {getRoleDisplayName(member.role)}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge variant="outline">
                    {getRoleDisplayName(member.role)}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className='space-y-3'>
              {/* Email */}
              <div className='space-y-1 text-sm'>
                <div className='flex items-center gap-2'>
                  <MailIcon className='h-3 w-3 text-muted-foreground' />
                  <span className='text-muted-foreground truncate'>
                    {member.email}
                  </span>
                </div>
              </div>

              {/* Dates */}
              <div className='text-xs text-muted-foreground space-y-1'>
                <div className='flex items-center gap-2'>
                  <Calendar className='h-3 w-3' />
                  <span>
                    Joined: {formatDateTime(member.createdAt)}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="absolute bottom-2 right-2 flex gap-2">
                {/* View User Details Button */}
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 rounded-full"
                  asChild
                >
                  <Link href={`/admin/users/${member.id}`} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                </Button>

                {/* Edit Role Button */}
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 rounded-full"
                  onClick={() => handleEditClick(member)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit Role Dialog */}
      <EditRoleDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        member={selectedMember}
      />
    </>
  );
}
