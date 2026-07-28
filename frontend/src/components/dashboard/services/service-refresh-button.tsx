'use client';

import React, { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { refreshService } from '@/actions/services';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { el } from 'date-fns/locale';

interface ServiceRefreshButtonProps {
  serviceId: number;
  refreshedAt: Date | null;
  isPublished: boolean;
  onRefreshSuccess?: () => void;
}

export default function ServiceRefreshButton({
  serviceId,
  refreshedAt,
  isPublished,
  onRefreshSuccess,
}: ServiceRefreshButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [localLastRefreshed, setLocalLastRefreshed] = useState<Date | null>(
    refreshedAt ? new Date(refreshedAt) : null,
  );

  // Calculate if service can be refreshed (24-hour cooldown)
  const canRefresh = () => {
    if (!localLastRefreshed) return true;

    const hoursSinceRefresh =
      (Date.now() - localLastRefreshed.getTime()) / (1000 * 60 * 60);
    return hoursSinceRefresh >= 24;
  };

  // Calculate remaining time until next refresh
  const getRemainingTime = () => {
    if (!localLastRefreshed || canRefresh()) return null;

    const hoursSinceRefresh =
      (Date.now() - localLastRefreshed.getTime()) / (1000 * 60 * 60);
    const hoursRemaining = Math.ceil(24 - hoursSinceRefresh);

    if (hoursRemaining === 1) return '1 ώρα';
    return `${hoursRemaining} ώρες`;
  };

  const handleRefresh = async () => {
    if (!isPublished || !canRefresh() || isPending) return;

    startTransition(async () => {
      try {
        const result = await refreshService(serviceId);

        if (result.success) {
          // Update local state for optimistic UI
          setLocalLastRefreshed(new Date());

          // Show success message with remaining refreshes
          toast.success('Η υπηρεσία ανανεώθηκε επιτυχώς!', {
            description: result.data?.remainingRefreshes
              ? `Απομένουν ${result.data.remainingRefreshes} ανανεώσεις για σήμερα`
              : undefined,
          });

          // Trigger callback if provided
          if (onRefreshSuccess) {
            onRefreshSuccess();
          }

          // Refresh the page data
          router.refresh();
        } else {
          // Show error message
          toast.error('Αποτυχία ανανέωσης', {
            description: result.error,
          });
        }
      } catch (error) {
        console.error('Refresh error:', error);
        toast.error('Σφάλμα', {
          description: 'Παρουσιάστηκε ένα σφάλμα. Δοκιμάστε ξανά.',
        });
      }
    });
  };

  const remainingTime = getRemainingTime();
  const isRefreshable = canRefresh();

  // Show time since last refresh or refresh button
  if (localLastRefreshed && !isRefreshable) {
    return (
      <div className='flex flex-col gap-1'>
        <span className='text-xs text-muted-foreground'>
          Ανανεώθηκε πριν{' '}
          {formatDistanceToNow(localLastRefreshed, { locale: el })}
        </span>
        {remainingTime && (
          <span className='text-xs text-amber-600'>
            Διαθέσιμο σε {remainingTime}
          </span>
        )}
      </div>
    );
  }

  return (
    <Button
      variant='outline'
      size='sm'
      onClick={handleRefresh}
      disabled={isPending || !isRefreshable || !isPublished}
      className='text-primary gap-1.5 px-2 py-[5px] h-fit'
    >
      <RefreshCw className={`!size-3.5 ${isPending ? 'animate-spin' : ''}`} />
      Ανανέωση
    </Button>
  );
}
