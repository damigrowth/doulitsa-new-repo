'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';

interface ShareReviewLinkProps {
  username: string;
  className?: string;
}

export function ShareReviewLink({ username, className }: ShareReviewLinkProps) {
  const [copied, setCopied] = useState(false);

  const reviewUrl = `https://doulitsa.gr/profile/${username}#review`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(reviewUrl);
      setCopied(true);
      toast.success('Ο σύνδεσμος αντιγράφηκε!');

      // Reset copied state after 2 seconds
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Αποτυχία αντιγραφής συνδέσμου');
    }
  };

  return (
    <Card className={className}>
      <CardContent className='pt-6'>
        <div className='space-y-4'>
          <p className='text-sm text-gray-700'>
            Θέλετε να συγκεντρώσετε περισσότερες αξιολογήσεις; Κοινοποιήστε στους
            πελάτες σας το παρακάτω σύνδεσμο για να σας αξιολογήσουν!
          </p>

          <div className='flex items-center gap-2'>
            <div className='flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm text-gray-700 break-all'>
              {reviewUrl}
            </div>

            <Button
              onClick={handleCopy}
              variant='outline'
              size='icon'
              className='flex-shrink-0'
            >
              {copied ? (
                <Check className='h-4 w-4 text-green-600' />
              ) : (
                <Copy className='h-4 w-4' />
              )}
              <span className='sr-only'>
                {copied ? 'Αντιγράφηκε' : 'Αντιγραφή συνδέσμου'}
              </span>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
