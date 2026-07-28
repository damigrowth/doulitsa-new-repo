'use client';

import { useEffect, useActionState, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, RotateCcw } from 'lucide-react';
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
import { updateVerificationStatusAction } from '@/actions/admin/verifications';
import { toast } from 'sonner';

interface AdminVerificationActionsProps {
  verificationId: string;
  profileName: string;
  currentStatus: string;
}

export function AdminVerificationActions({
  verificationId,
  profileName,
  currentStatus,
}: AdminVerificationActionsProps) {
  const router = useRouter();
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showRevertDialog, setShowRevertDialog] = useState(false);

  // Three separate action states for approve, reject, and revert
  const [approveState, approveAction, approvePending] = useActionState(
    updateVerificationStatusAction,
    null,
  );
  const [rejectState, rejectAction, rejectPending] = useActionState(
    updateVerificationStatusAction,
    null,
  );
  const [revertState, revertAction, revertPending] = useActionState(
    updateVerificationStatusAction,
    null,
  );

  // Handle approve state changes
  useEffect(() => {
    if (approveState?.success) {
      toast.success('Verification approved successfully');
      setShowApproveDialog(false);
      router.push('/admin/verifications');
      router.refresh();
    } else if (approveState?.error) {
      toast.error(approveState.error);
    }
  }, [approveState, router]);

  // Handle reject state changes
  useEffect(() => {
    if (rejectState?.success) {
      toast.success('Verification rejected successfully');
      setShowRejectDialog(false);
      router.push('/admin/verifications');
      router.refresh();
    } else if (rejectState?.error) {
      toast.error(rejectState.error);
    }
  }, [rejectState, router]);

  // Handle revert state changes
  useEffect(() => {
    if (revertState?.success) {
      toast.success('Verification reverted to pending');
      setShowRevertDialog(false);
      router.refresh();
    } else if (revertState?.error) {
      toast.error(revertState.error);
    }
  }, [revertState, router]);

  const handleApprove = (formData: FormData) => {
    formData.set('verificationId', verificationId);
    formData.set('status', 'APPROVED');
    approveAction(formData);
  };

  const handleReject = (formData: FormData) => {
    formData.set('verificationId', verificationId);
    formData.set('status', 'REJECTED');
    rejectAction(formData);
  };

  const handleRevert = (formData: FormData) => {
    formData.set('verificationId', verificationId);
    formData.set('status', 'PENDING');
    revertAction(formData);
  };

  const isLoading = approvePending || rejectPending || revertPending;

  return (
    <>
      <div className='flex justify-end gap-3'>
        {/* PENDING: Show Approve and Reject */}
        {currentStatus === 'PENDING' && (
          <>
            <Button
              variant='destructive'
              onClick={() => setShowRejectDialog(true)}
              disabled={isLoading}
            >
              <XCircle className='mr-2 h-4 w-4' />
              Reject Verification
            </Button>
            <Button
              onClick={() => setShowApproveDialog(true)}
              disabled={isLoading}
            >
              <CheckCircle2 className='mr-2 h-4 w-4' />
              Approve Verification
            </Button>
          </>
        )}

        {/* APPROVED: Show Reject and Revert to Pending */}
        {currentStatus === 'APPROVED' && (
          <>
            <Button
              variant='destructive'
              onClick={() => setShowRejectDialog(true)}
              disabled={isLoading}
            >
              <XCircle className='mr-2 h-4 w-4' />
              Reject Verification
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
        {currentStatus === 'REJECTED' && (
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
              Approve Verification
            </Button>
          </>
        )}
      </div>

      {/* Approve Confirmation Dialog */}
      <AlertDialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve Verification</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to approve the verification for{' '}
              <span className='font-semibold'>{profileName}</span>? This will
              mark the profile as verified.
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
            <AlertDialogTitle>Reject Verification</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to reject the verification for{' '}
              <span className='font-semibold'>{profileName}</span>? This action
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
              Are you sure you want to revert the verification for{' '}
              <span className='font-semibold'>{profileName}</span> back to
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
    </>
  );
}
