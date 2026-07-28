'use client';

import { useEffect, useActionState, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, RotateCcw, Eye, EyeOff } from 'lucide-react';
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
import { updateReviewStatusAction, toggleAdminReviewVisibility } from '@/actions/admin/reviews';
import { toast } from 'sonner';

interface AdminReviewActionsProps {
  reviewId: string;
  authorName: string;
  currentStatus: string;
  currentPublished: boolean;
  currentVisibility: boolean;
}

export function AdminReviewActions({
  reviewId,
  authorName,
  currentStatus,
  currentPublished,
  currentVisibility,
}: AdminReviewActionsProps) {
  const router = useRouter();
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showRevertDialog, setShowRevertDialog] = useState(false);
  const [showVisibilityDialog, setShowVisibilityDialog] = useState(false);
  const [isTogglingVisibility, setIsTogglingVisibility] = useState(false);

  // Three separate action states for approve, reject, and revert
  const [approveState, approveAction, approvePending] = useActionState(
    updateReviewStatusAction,
    null,
  );
  const [rejectState, rejectAction, rejectPending] = useActionState(
    updateReviewStatusAction,
    null,
  );
  const [revertState, revertAction, revertPending] = useActionState(
    updateReviewStatusAction,
    null,
  );

  // Handle approve state changes
  useEffect(() => {
    if (approveState?.success) {
      toast.success('Review approved successfully');
      setShowApproveDialog(false);
      router.push('/admin/reviews');
      router.refresh();
    } else if (approveState?.error) {
      toast.error(approveState.error);
    }
  }, [approveState, router]);

  // Handle reject state changes
  useEffect(() => {
    if (rejectState?.success) {
      toast.success('Review rejected successfully');
      setShowRejectDialog(false);
      router.push('/admin/reviews');
      router.refresh();
    } else if (rejectState?.error) {
      toast.error(rejectState.error);
    }
  }, [rejectState, router]);

  // Handle revert state changes
  useEffect(() => {
    if (revertState?.success) {
      toast.success('Review reverted to pending');
      setShowRevertDialog(false);
      router.refresh();
    } else if (revertState?.error) {
      toast.error(revertState.error);
    }
  }, [revertState, router]);

  const handleApprove = (formData: FormData) => {
    formData.set('reviewId', reviewId);
    formData.set('status', 'approved');
    approveAction(formData);
  };

  const handleReject = (formData: FormData) => {
    formData.set('reviewId', reviewId);
    formData.set('status', 'rejected');
    rejectAction(formData);
  };

  const handleRevert = (formData: FormData) => {
    formData.set('reviewId', reviewId);
    formData.set('status', 'pending');
    revertAction(formData);
  };

  const handleToggleVisibility = async () => {
    setIsTogglingVisibility(true);
    try {
      const result = await toggleAdminReviewVisibility(reviewId);
      if (result.success) {
        toast.success(result.message);
        setShowVisibilityDialog(false);
        router.refresh();
      } else {
        toast.error(result.error || 'Failed to toggle visibility');
      }
    } catch (error) {
      toast.error('Failed to toggle visibility');
    } finally {
      setIsTogglingVisibility(false);
    }
  };

  const isLoading = approvePending || rejectPending || revertPending || isTogglingVisibility;

  return (
    <>
      <div className='flex justify-end gap-3'>
        {/* Visibility Toggle - Only for approved & published reviews */}
        {currentStatus === 'approved' && currentPublished && (
          <Button
            variant='outline'
            onClick={() => setShowVisibilityDialog(true)}
            disabled={isLoading}
          >
            {currentVisibility ? (
              <>
                <EyeOff className='mr-2 h-4 w-4' />
                Hide Comment
              </>
            ) : (
              <>
                <Eye className='mr-2 h-4 w-4' />
                Show Comment
              </>
            )}
          </Button>
        )}
        {/* PENDING: Show Approve and Reject */}
        {currentStatus === 'pending' && (
          <>
            <Button
              variant='destructive'
              onClick={() => setShowRejectDialog(true)}
              disabled={isLoading}
            >
              <XCircle className='mr-2 h-4 w-4' />
              Reject Review
            </Button>
            <Button
              onClick={() => setShowApproveDialog(true)}
              disabled={isLoading}
            >
              <CheckCircle2 className='mr-2 h-4 w-4' />
              Approve Review
            </Button>
          </>
        )}

        {/* APPROVED: Show Reject and Revert to Pending */}
        {currentStatus === 'approved' && (
          <>
            <Button
              variant='destructive'
              onClick={() => setShowRejectDialog(true)}
              disabled={isLoading}
            >
              <XCircle className='mr-2 h-4 w-4' />
              Reject Review
            </Button>
            <Button
              variant='outline'
              onClick={() => setShowRevertDialog(true)}
              disabled={isLoading}
            >
              <RotateCcw className='mr-2 h-4 w-4' />
              Revert to Pending
            </Button>
          </>
        )}

        {/* REJECTED: Show Approve and Revert to Pending */}
        {currentStatus === 'rejected' && (
          <>
            <Button
              variant='outline'
              onClick={() => setShowRevertDialog(true)}
              disabled={isLoading}
            >
              <RotateCcw className='mr-2 h-4 w-4' />
              Revert to Pending
            </Button>
            <Button
              onClick={() => setShowApproveDialog(true)}
              disabled={isLoading}
            >
              <CheckCircle2 className='mr-2 h-4 w-4' />
              Approve Review
            </Button>
          </>
        )}
      </div>

      {/* Approve Confirmation Dialog */}
      <AlertDialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve Review</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to approve this review from{' '}
              <span className='font-semibold'>{authorName}</span>? This will
              make it publicly visible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={approvePending}>
              Cancel
            </AlertDialogCancel>
            <form action={handleApprove}>
              <AlertDialogAction type='submit' disabled={approvePending}>
                {approvePending ? 'Approving...' : 'Approve'}
              </AlertDialogAction>
            </form>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject Confirmation Dialog */}
      <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Review</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to reject this review from{' '}
              <span className='font-semibold'>{authorName}</span>? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={rejectPending}>
              Cancel
            </AlertDialogCancel>
            <form action={handleReject}>
              <AlertDialogAction
                type='submit'
                disabled={rejectPending}
                className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
              >
                {rejectPending ? 'Rejecting...' : 'Reject'}
              </AlertDialogAction>
            </form>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Revert to Pending Confirmation Dialog */}
      <AlertDialog open={showRevertDialog} onOpenChange={setShowRevertDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revert to Pending</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to revert this review from{' '}
              <span className='font-semibold'>{authorName}</span> back to
              pending status?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={revertPending}>
              Cancel
            </AlertDialogCancel>
            <form action={handleRevert}>
              <AlertDialogAction type='submit' disabled={revertPending}>
                {revertPending ? 'Reverting...' : 'Revert to Pending'}
              </AlertDialogAction>
            </form>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Visibility Toggle Confirmation Dialog */}
      <AlertDialog open={showVisibilityDialog} onOpenChange={setShowVisibilityDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {currentVisibility ? 'Hide Review Comment' : 'Show Review Comment'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {currentVisibility ? (
                <>
                  Are you sure you want to hide this review comment from{' '}
                  <span className='font-semibold'>{authorName}</span>? The review
                  will remain approved but the comment will not be visible to the public.
                </>
              ) : (
                <>
                  Are you sure you want to show this review comment from{' '}
                  <span className='font-semibold'>{authorName}</span>? The comment
                  will become publicly visible.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isTogglingVisibility}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleToggleVisibility}
              disabled={isTogglingVisibility}
            >
              {isTogglingVisibility
                ? 'Processing...'
                : currentVisibility
                  ? 'Hide Comment'
                  : 'Show Comment'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
