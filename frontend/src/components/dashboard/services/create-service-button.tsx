'use client';

import { Plus } from 'lucide-react';
import { Button, type ButtonProps } from '@/components/ui/button';
import { NextLink } from '@/components';
import { useSubscriptionSheetStore } from '@/lib/stores/use-subscription-sheet-store';

interface CreateServiceButtonProps {
  canCreateMore: boolean;
  variant?: ButtonProps['variant'];
  className?: string;
  children?: React.ReactNode;
}

/**
 * Create service button with plan limit gate.
 * Shows upgrade sheet when user has reached max services.
 * Uses the store directly (not useSubscriptionGate) because the limit
 * dialog should always show, even when payments are in test mode.
 */
export default function CreateServiceButton({
  canCreateMore,
  variant,
  className = '',
  children,
}: CreateServiceButtonProps) {
  const { open } = useSubscriptionSheetStore();

  if (!canCreateMore) {
    return (
      <Button
        variant={variant}
        className={className}
        onClick={() =>
          open(
            'Έχει φτάσει το μέγιστο όριο υπηρεσιών για το δωρεάν πακέτο προβολής.',
          )
        }
      >
        {children || (
          <>
            <Plus className='w-4 h-4 mr-2' />
            Νέα Υπηρεσία
          </>
        )}
      </Button>
    );
  }

  return (
    <Button asChild variant={variant} className={className}>
      <NextLink href='/dashboard/services/create'>
        {children || (
          <>
            <Plus className='w-4 h-4 mr-2' />
            Νέα Υπηρεσία
          </>
        )}
      </NextLink>
    </Button>
  );
}
