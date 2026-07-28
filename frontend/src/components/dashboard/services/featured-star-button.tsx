'use client';

import { useState, useTransition } from 'react';
import { Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toggleFeaturedService } from '@/actions/subscription/toggle-featured-service';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { useSubscriptionGate } from '@/lib/hooks/use-subscription-gate';
import { usePaymentsAccess } from '@/lib/hooks/use-payments-access';

interface FeaturedStarButtonProps {
  serviceId: number;
  featured: boolean;
  canFeatureMore: boolean;
  isPublished: boolean;
}

/**
 * Featured star toggle button for service list.
 * Allows promoted subscribers to feature/unfeature services.
 * Triggers upgrade sheet if user has no subscription or reached limit.
 * Hidden in test mode for non-admins.
 */
export default function FeaturedStarButton({
  serviceId,
  featured,
  canFeatureMore,
  isPublished,
}: FeaturedStarButtonProps) {
  const [isFeatured, setIsFeatured] = useState(featured);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const { openUpgradeSheet } = useSubscriptionGate();
  const { allowed, isLoading } = usePaymentsAccess();

  // Don't show button for non-published services
  if (!isPublished) {
    return null;
  }

  // Hide in test mode for non-admins
  if (!isLoading && !allowed) {
    return null;
  }

  const handleToggle = () => {
    // If trying to feature but can't feature more, show upgrade sheet
    if (!isFeatured && !canFeatureMore) {
      openUpgradeSheet(
        'Για να προωθήσεις υπηρεσίες, χρειάζεσαι το Προωθημένο πακέτο.',
      );
      return;
    }

    startTransition(async () => {
      const result = await toggleFeaturedService(serviceId);

      if (result.success) {
        setIsFeatured(result.data.featured);
        toast.success(
          result.data.featured
            ? 'Η υπηρεσία έγινε προωθημένη'
            : 'Η προώθηση ακυρώθηκε',
        );
        router.refresh();
      } else {
        // Check if error is about subscription limit
        if (result.error?.includes('μέγιστο αριθμό')) {
          openUpgradeSheet(result.error);
        } else {
          toast.error(result.error || 'Αποτυχία ενημέρωσης');
        }
      }
    });
  };

  return (
    <Button
      variant='ghost'
      size='icon'
      className={cn(
        'h-8 w-8',
        isFeatured && 'text-yellow-500 hover:text-yellow-600',
      )}
      onClick={handleToggle}
      disabled={isPending}
      title={isFeatured ? 'Ακύρωση προώθησης' : 'Προώθηση υπηρεσίας'}
    >
      <Star
        className={cn('w-4 h-4', isFeatured && 'fill-current')}
        aria-label={isFeatured ? 'Προβαλλόμενη' : 'Μη προβαλλόμενη'}
      />
    </Button>
  );
}
