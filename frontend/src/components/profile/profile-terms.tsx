import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatText } from '@/lib/utils/formatting';
import React from 'react';

type ProfileTermsProps = {
  terms: string | null;
};

export default function ProfileTerms({ terms }: ProfileTermsProps) {
  if (!terms) {
    return null;
  }

  const formattedTerms = formatText(terms);

  return (
    <section>
      <Card className='rounded-2xl border-gray-100 shadow-sm'>
        <CardHeader className='pb-4'>
          <CardTitle className='text-lg font-semibold'>
            Όροι Συνεργασίας
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className='space-y-1'>{formattedTerms}</div>
        </CardContent>
      </Card>
    </section>
  );
}
