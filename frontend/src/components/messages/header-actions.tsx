/**
 * Client Component: Chat header action menu and dialogs
 * Interactive dropdown menu with block confirmation dialog
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { MoreVertical } from 'lucide-react';
import { toast } from 'sonner';
import { blockUser } from '@/actions/messages/blocking';
import { NextLink } from '@/components';

interface HeaderActionsProps {
  chatId: string;
  userId: string;
  currentUserId: string;
  username: string | null;
  displayName: string;
  profileUrl: string;
  userType: string | null;
}

export function HeaderActions({
  chatId,
  userId,
  currentUserId,
  username,
  displayName,
  profileUrl,
  userType,
}: HeaderActionsProps) {
  const router = useRouter();
  const [isBlockDialogOpen, setIsBlockDialogOpen] = useState(false);
  const [isBlockLoading, setIsBlockLoading] = useState(false);

  const handleBlockClick = () => {
    setIsBlockDialogOpen(true);
  };

  const handleBlockConfirm = async () => {
    setIsBlockLoading(true);
    try {
      await blockUser(currentUserId, userId);
      toast.success(`Ο/Η ${displayName} αποκλείστηκε`);
      setIsBlockDialogOpen(false);
      // Redirect to messages list
      router.push('/dashboard/messages');
      router.refresh();
    } catch (error) {
      console.error('Failed to block user:', error);
      toast.error(
        error instanceof Error ? error.message : 'Αποτυχία αποκλεισμού χρήστη',
      );
    } finally {
      setIsBlockLoading(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size='icon' variant='ghost'>
            <MoreVertical className='h-5 w-5' />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className='w-fit rounded-xl' align='end'>
          {username && userType === 'pro' && (
            <DropdownMenuItem asChild>
              <NextLink href={profileUrl} target='_blank'>
                Προβολή Προφίλ
              </NextLink>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={handleBlockClick}>
            Αποκλεισμός
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Block Confirmation Dialog */}
      <AlertDialog open={isBlockDialogOpen} onOpenChange={setIsBlockDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Αποκλεισμός {displayName};</AlertDialogTitle>
            <AlertDialogDescription>
              Αυτός ο χρήστης δεν θα μπορεί πλέον να σας στέλνει μηνύματα.
              Μπορείτε να τον ξεμπλοκάρετε ανά πάσα στιγμή από τις ρυθμίσεις
              σας.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBlockLoading}>
              Ακύρωση
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleBlockConfirm();
              }}
              disabled={isBlockLoading}
              className='bg-dark text-white hover:bg-dark/90'
            >
              {isBlockLoading ? 'Αποκλεισμός...' : 'Αποκλεισμός'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
