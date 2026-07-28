'use client';

import React, { useState, useTransition } from 'react';
import {
  Share2,
  Facebook,
  Linkedin,
  Mail,
  Link as LinkIcon,
  Heart,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import AuthRequiredDialog from '@/components/shared/auth-required-dialog';
import { BreadcrumbButtonsProps } from '@/lib/types';
import { useSession } from '@/lib/auth/client';
import { toggleSave } from '@/actions/saved';
import { useSavedState } from '@/lib/providers/saved-state-provider';

export default function BreadcrumbButtons({
  subjectTitle,
  id,
  saveType,
  isOwner = false,
}: BreadcrumbButtonsProps) {
  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';
  const { data: session } = useSession();
  const { isSaved: checkSaved, updateSavedState } = useSavedState();
  const [isPending, startTransition] = useTransition();
  const [showAuthDialog, setShowAuthDialog] = useState(false);

  const itemType = saveType as 'service' | 'profile' | undefined;
  const isSaved = itemType && !isOwner ? checkSaved(itemType, id) : false;

  const handleSaveToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!itemType) return;

    if (!session?.user) {
      setShowAuthDialog(true);
      return;
    }

    const previousState = isSaved;
    const newState = !isSaved;
    updateSavedState(itemType, id, newState);

    startTransition(async () => {
      const result = await toggleSave(itemType, id);

      if (!result.success) {
        updateSavedState(itemType, id, previousState);
      } else if (result.data) {
        updateSavedState(itemType, id, result.data.isSaved);
      }
    });
  };

  const handleShareClick = (platform: string) => {
    let shareUrl = '';

    switch (platform) {
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(currentUrl)}`;
        window.open(shareUrl, '_blank');
        break;
      case 'linkedin':
        shareUrl = `https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(
          currentUrl,
        )}`;
        window.open(shareUrl, '_blank');
        break;
      case 'email':
        shareUrl = `mailto:?subject=${encodeURIComponent(
          subjectTitle,
        )}&body=${encodeURIComponent(currentUrl)}`;
        window.location.href = shareUrl;
        break;
      case 'copy':
        navigator.clipboard.writeText(currentUrl);
        break;
      default:
        break;
    }
  };

  return (
    <>
      {/* Auth Required Dialog */}
      <AuthRequiredDialog
        open={showAuthDialog}
        onOpenChange={setShowAuthDialog}
        title='Για να αποθηκεύσεις στα αγαπημένα πρέπει να έχεις λογαριασμό'
      />

      <div className='flex items-center justify-end gap-2'>
        {/* Share Button with Popover */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant='ghost'
              size='sm'
              className='flex items-center gap-0 px-0 xl:gap-3 xl:px-3 text-body hover:text-primary bg-transparent hover:bg-transparent'
            >
              <div className='w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center'>
                <Share2 className='h-4 w-4' />
              </div>
              <span className='hidden xl:inline text-sm'>Κοινοποίηση</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className='w-auto p-3' align='end'>
            <div className='flex gap-2'>
              <Button
                variant='ghost'
                size='sm'
                onClick={() => handleShareClick('facebook')}
                className='h-8 w-8 p-0 hover:bg-blue-50 hover:text-blue-600'
              >
                <Facebook className='h-4 w-4' />
              </Button>
              <Button
                variant='ghost'
                size='sm'
                onClick={() => handleShareClick('linkedin')}
                className='h-8 w-8 p-0 hover:bg-blue-50 hover:text-blue-600'
              >
                <Linkedin className='h-4 w-4' />
              </Button>
              <Button
                variant='ghost'
                size='sm'
                onClick={() => handleShareClick('email')}
                className='h-8 w-8 p-0 hover:bg-blue-50 hover:text-blue-600'
              >
                <Mail className='h-4 w-4' />
              </Button>
              <Button
                variant='ghost'
                size='sm'
                onClick={() => handleShareClick('copy')}
                className='h-8 w-8 p-0 hover:bg-blue-50 hover:text-blue-600'
              >
                <LinkIcon className='h-4 w-4' />
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        {/* Save Button — hidden for owners (server-computed, no hydration issue) */}
        {saveType && !isOwner && (
          <>
            <Separator orientation='vertical' className='h-6' />
            <Button
              variant='ghost'
              size='sm'
              className='flex items-center gap-0 px-0 xl:gap-3 xl:px-3 hover:text-primary bg-transparent hover:bg-transparent'
              onClick={handleSaveToggle}
              disabled={isPending}
            >
              <div className='w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center'>
                <Heart
                  className={`h-4 w-4 ${isSaved ? 'fill-current text-red-500' : ''}`}
                />
              </div>
              <span
                className={`hidden xl:inline text-sm ${isSaved ? 'text-red-500' : 'text-body'}`}
              >
                {isSaved ? 'Αποθηκεύτηκε' : 'Αποθήκευση'}
              </span>
            </Button>
          </>
        )}
      </div>
    </>
  );
}
