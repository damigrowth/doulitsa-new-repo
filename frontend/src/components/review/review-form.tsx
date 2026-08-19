'use client';

import { useState, useActionState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { RatingStars } from './rating-stars';
import { ReviewSuccess } from './review-success';
import { createReview } from '@/actions/reviews/create-review';
import { Loader2, Send, ThumbsUp, ThumbsDown } from 'lucide-react';
import { useSession } from '@/lib/auth/client';

interface ReviewFormProps {
  profileId: string;
  serviceId?: number;
  type: 'service' | 'profile';
  profileServices?: Array<{ id: number; title: string }>;
  onSuccess?: () => void;
}

export function ReviewForm({
  profileId,
  serviceId,
  type,
  profileServices,
  onSuccess,
}: ReviewFormProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const [rating, setRating] = useState(0); // Changed: Start with 0 (no selection)
  const [comment, setComment] = useState('');
  const [selectedService, setSelectedService] = useState<number | null>(
    serviceId || null,
  );
  const [showComment, setShowComment] = useState(false); // New: Show comment after button click
  const [showLoginDialog, setShowLoginDialog] = useState(false);

  const [state, formAction, isPending] = useActionState(createReview, null);

  // Get reviewId directly from state (legacy pattern)
  const reviewId = state?.data?.id;

  // Check if user is logged in
  const isLoggedIn = !!session?.user?.id;

  const handleSubmit = async (formData: FormData) => {
    // If not logged in, show login dialog instead of submitting
    if (!isLoggedIn) {
      setShowLoginDialog(true);
      return;
    }

    // Validate required fields before submission
    if (!profileId) {
      console.error('ProfileId is missing! Cannot submit review.', {
        profileId,
        type,
        serviceId,
      });
      return;
    }

    formData.append('rating', rating.toString());
    formData.append('comment', comment);
    formData.append('profileId', profileId);

    // Add serviceId - either from prop (service page) or selected (profile page)
    const finalServiceId = type === 'service' ? serviceId : selectedService;
    if (finalServiceId) {
      formData.append('serviceId', finalServiceId.toString());
    }

    // Submit form - state.data.id will be set automatically by useActionState
    await formAction(formData);
  };

  const commentLength = comment.length;
  const minLength = 25;
  const maxLength = 350;
  const isCommentValid =
    commentLength >= minLength && commentLength <= maxLength;

  // If review submitted successfully, show success component
  if (reviewId) {
    return <ReviewSuccess />;
  }

  // Show form (for both logged in and guest users)
  return (
    <form action={handleSubmit} className='space-y-6'>
      {/* Service Selection - Only for freelancer/profile reviews */}
      {type === 'profile' && profileServices && profileServices.length > 0 && (
        <div className='space-y-2'>
          <Label className='text-base font-semibold'>
            Επιλογή υπηρεσίας <span className='text-destructive'>*</span>
          </Label>
          <Select
            value={selectedService?.toString() || ''}
            onValueChange={(val) => setSelectedService(Number(val))}
            disabled={isPending}
          >
            <SelectTrigger>
              <SelectValue placeholder='Επιλέξτε υπηρεσία' />
            </SelectTrigger>
            <SelectContent>
              {profileServices.map((service) => (
                <SelectItem key={service.id} value={service.id.toString()}>
                  {service.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Like/Unlike Buttons - Boss requirement */}
      <div className='space-y-3'>
        <Label className='text-base font-semibold'>Θα σύστηνες την υπηρεσία και σε άλλους;</Label>
        <div className='flex flex-row gap-3'>
          <Button
            type='button'
            variant={rating === 5 ? 'secondary' : 'outline'}
            size='lg'
            onClick={() => {
              setRating(5);
              setShowComment(true);
            }}
            disabled={isPending}
            className='flex-1 max-w-[160px] rounded-full transition-all duration-300 ease-in-out'
          >
            <ThumbsUp className='mr-2 h-5 w-5' />
            Ναι
          </Button>

          <Button
            type='button'
            variant={rating === 1 ? 'destructive' : 'outline'}
            size='lg'
            onClick={() => {
              setRating(1);
              setShowComment(true);
            }}
            disabled={isPending}
            className='flex-1 max-w-[160px] rounded-full transition-all duration-300 ease-in-out'
          >
            <ThumbsDown className='mr-2 h-5 w-5' />
            Όχι
          </Button>
        </div>
      </div>

      {/* Comment Input - Conditional (shown after Like/Unlike click) */}
      {showComment && (
        <div className='space-y-2'>
          <div className='flex items-center justify-between'>
            <Label htmlFor='comment' className='text-base font-semibold'>
              Σχόλιο (προαιρετικό)
            </Label>
            <span className='text-sm text-gray-500'>
              {commentLength}/{maxLength}
            </span>
          </div>
          <Textarea
            id='comment'
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder='Αν θέλεις γράψε ένα σχόλιο στην σύσταση'
            className='min-h-[120px] resize-none'
            maxLength={maxLength}
            disabled={isPending}
          />
        </div>
      )}

      {/* Error Display - ActionResponse uses message field */}
      {state && !state.success && state.message && (
        <Alert variant='destructive'>
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      )}

      {/* Submit Button - Centered */}
      <div className='pt-2'>
        <Button
          type='submit'
          disabled={isPending}
          className='min-w-[200px]'
        >
          {isPending ? (
            <>
              <Loader2 className='mr-2 h-4 w-4 animate-spin' />
              Αποστολή...
            </>
          ) : (
            <>
              <Send className='mr-2 h-4 w-4' />
              Αξιολόγηση
            </>
          )}
        </Button>
      </div>

      {/* Login Dialog - shown when guest tries to submit */}
      <Dialog open={showLoginDialog} onOpenChange={setShowLoginDialog}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>
              Για να αξιολογήσεις πρέπει να έχεις λογαριασμό
            </DialogTitle>
            <DialogDescription className='sr-only'>
              Συνδεθείτε ή εγγραφείτε για να υποβάλετε αξιολόγηση
            </DialogDescription>
          </DialogHeader>
          <div className='flex gap-2 justify-center'>
            <Button
              type='button'
              variant='outline'
              onClick={() => {
                setShowLoginDialog(false);
                router.push('/login');
              }}
              className='rounded-full'
            >
              Σύνδεση
            </Button>
            <Button
              type='button'
              onClick={() => {
                setShowLoginDialog(false);
                router.push('/register');
              }}
              className='rounded-full'
            >
              Εγγραφή
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </form>
  );
}
