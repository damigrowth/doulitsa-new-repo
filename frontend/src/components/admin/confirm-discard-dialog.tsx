/**
 * Confirm Discard Dialog Component
 *
 * AlertDialog confirmation for discarding unpublished taxonomy changes
 * Replaces native browser confirm() with shadcn dialog
 */

'use client';

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
import { Trash2, AlertTriangle } from 'lucide-react';

interface ConfirmDiscardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  changeCount: number;
}

export function ConfirmDiscardDialog({
  open,
  onOpenChange,
  onConfirm,
  changeCount,
}: ConfirmDiscardDialogProps) {
  const handleConfirm = () => {
    onConfirm();
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Discard Unpublished Changes?
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              You are about to discard <strong>{changeCount}</strong> unpublished change
              {changeCount > 1 ? 's' : ''}.
            </p>
            <p className="text-sm text-destructive font-medium">
              ⚠️ This action cannot be undone.
            </p>
            <p className="text-sm text-muted-foreground">
              All local changes will be permanently removed from your browser.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Discard All Changes
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
