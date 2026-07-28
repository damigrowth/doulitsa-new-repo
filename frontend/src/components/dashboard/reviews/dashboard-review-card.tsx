'use client';

import { useState } from 'react';
import { Eye, EyeOff, ThumbsUp, ThumbsDown } from 'lucide-react';
import { formatDate } from '@/lib/utils/formatting/date';
import { Button } from '@/components/ui/button';
import { toggleReviewVisibility } from '@/actions/reviews';
import { toast } from 'sonner';
import type { DashboardReviewCardData } from '@/lib/types/reviews';

interface DashboardReviewCardProps {
  review: DashboardReviewCardData;
  showAuthor?: boolean; // For received reviews - show who wrote it
  showProfile?: boolean; // For given reviews - show who you reviewed
  showVisibilityToggle?: boolean; // Show visibility toggle for received reviews
}

export function DashboardReviewCard({
  review,
  showAuthor = false,
  showProfile = false,
  showVisibilityToggle = false,
}: DashboardReviewCardProps) {
  const [isPublished, setIsPublished] = useState(review.visibility);
  const [isToggling, setIsToggling] = useState(false);

  const displayPerson = showAuthor
    ? review.author
    : showProfile && review.reviewedProfile
      ? review.reviewedProfile
      : null;

  if (!displayPerson) return null;

  const handleToggleVisibility = async () => {
    setIsToggling(true);
    try {
      const result = await toggleReviewVisibility(review.id);
      if (result.success && result.data) {
        setIsPublished(result.data.visibility);
        toast.success(result.message);
      } else {
        toast.error(result.message || 'Αποτυχία ενημέρωσης εμφάνισης');
      }
    } catch (error) {
      toast.error('Αποτυχία ενημέρωσης εμφάνισης');
    } finally {
      setIsToggling(false);
    }
  };

  const { formattedDate } = formatDate(review.createdAt, 'dd/MM/yyyy');
  const isPositive = review.rating === 5;

  return (
    <div className='flex flex-col gap-3 pb-6 mb-6 border-b last:border-b-0 last:pb-0 last:mb-0'>
      {/* Comment with icon - FIRST */}
      {review.comment && (
        <div className='flex items-start gap-3'>
          <div className='shrink-0 mt-0.5'>
            {isPositive ? (
              <ThumbsUp className='h-5 w-5 text-green-600' />
            ) : (
              <ThumbsDown className='h-5 w-5 text-red-600' />
            )}
          </div>
          <p className='text-base font-semibold text-gray-900 leading-relaxed flex-1'>
            {review.comment}
          </p>
        </div>
      )}

      {/* From: name - date */}
      <div className='text-sm text-muted-foreground'>
        Από: <span className='font-medium'>{displayPerson.displayName}</span> - ({formattedDate})
      </div>

      {/* Service */}
      {review.service && (
        <div className='text-sm text-muted-foreground'>
          Υπηρεσία: <span className='font-medium'>{review.service.title}</span>
        </div>
      )}

      {/* Visibility Toggle Button */}
      <div className='flex items-center justify-between'>
        {showVisibilityToggle && review.status === 'approved' && (
          <Button
            variant='outline'
            size='sm'
            onClick={handleToggleVisibility}
            disabled={isToggling}
            title='Εμφάνιση σχολίου'
          >
            {isPublished ? (
              <>
                <Eye className='h-4 w-4 mr-1' />
                Εμφάνιση σχολίου
              </>
            ) : (
              <>
                <EyeOff className='h-4 w-4 mr-1' />
                Εμφάνιση σχολίου
              </>
            )}
          </Button>
        )}

        {/* Status badges */}
        <div className='flex items-center gap-2'>
          {review.status === 'pending' && (
            <span className='text-xs px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded-full'>
              Σε αναμονή έγκρισης
            </span>
          )}
          {review.status === 'rejected' && (
            <span className='text-xs px-2 py-0.5 bg-red-100 text-red-800 rounded-full'>
              Απορρίφθηκε
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
