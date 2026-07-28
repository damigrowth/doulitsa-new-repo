'use client';

import { useState, useTransition } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Heart, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toggleSave } from '@/actions/saved';
import { useSession } from '@/lib/auth/client';
import { useSavedState } from '@/lib/providers/saved-state-provider';
import AuthRequiredDialog from './auth-required-dialog';

interface SaveButtonProps {
  itemType: 'service' | 'profile';
  itemId: string | number;
  /** User ID of the item owner — hides button if it matches the logged-in user */
  ownerId?: string;
  variant?: 'save' | 'remove';
  className?: string;
  onToggle?: (isSaved: boolean) => void;
}

export default function SaveButton({
  itemType,
  itemId,
  ownerId,
  variant = 'save',
  className = '',
  onToggle,
}: SaveButtonProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = useSession();
  const { isSaved: checkSaved, updateSavedState } = useSavedState();

  const isOwnItem =
    !!ownerId && !!session?.user?.id && session.user.id === ownerId;

  const contextSaved = isOwnItem ? false : checkSaved(itemType, itemId);
  const [localSaved, setLocalSaved] = useState<boolean | null>(null);
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [isPending, startTransition] = useTransition();

  const isSaved = localSaved ?? contextSaved;
  const isInDashboard = pathname?.startsWith('/dashboard');

  // Own items: don't render.
  // Safe from hydration mismatch because variant='save' buttons start
  // at opacity-0 (invisible), and this only triggers on re-render
  // after session loads — not during initial hydration.
  if (isOwnItem) return null;

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!session?.user) {
      setShowAuthDialog(true);
      return;
    }

    const previousState = isSaved;
    const newState = !isSaved;
    setLocalSaved(newState);
    updateSavedState(itemType, itemId, newState);
    onToggle?.(newState);

    startTransition(async () => {
      const result = await toggleSave(itemType, itemId);

      if (!result.success) {
        setLocalSaved(previousState);
        updateSavedState(itemType, itemId, previousState);
        onToggle?.(previousState);
      } else if (result.data) {
        setLocalSaved(result.data.isSaved);
        updateSavedState(itemType, itemId, result.data.isSaved);
        onToggle?.(result.data.isSaved);

        if (isInDashboard && pathname?.includes('/saved')) {
          router.refresh();
        }
      }
    });
  };

  const button =
    variant === 'remove' ? (
      <Button
        variant='ghost'
        size='sm'
        className={`h-8 w-8 p-0 rounded-full bg-muted text-gray-500 hover:text-red-500 hover:bg-red-50 ${className}`}
        onClick={handleToggle}
        disabled={isPending}
        aria-label='Διαγραφή'
      >
        <Trash2 className='h-4 w-4' />
      </Button>
    ) : (
      <Button
        variant='ghost'
        size='sm'
        className={`h-8 w-8 p-0 rounded-full ${
          isSaved
            ? 'text-red-500 hover:text-red-600 bg-red-50'
            : 'text-gray-400 hover:text-red-500 bg-muted'
        } ${className}`}
        onClick={handleToggle}
        disabled={isPending}
        aria-label={isSaved ? 'Διαγραφή' : 'Αποθήκευση'}
      >
        <Heart className={`h-4 w-4 ${isSaved ? 'fill-current' : ''}`} />
      </Button>
    );

  return (
    <>
      {button}
      <AuthRequiredDialog
        open={showAuthDialog}
        onOpenChange={setShowAuthDialog}
        title='Για να αποθηκεύσεις στα αγαπημένα πρέπει να έχεις λογαριασμό'
      />
    </>
  );
}
