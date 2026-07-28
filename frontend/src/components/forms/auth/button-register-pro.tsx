import React from 'react';
import NextLink from '@/components/shared/next-link';
import { Button } from '@/components/ui/button';
import { getCurrentSession } from '@/actions/auth/server';

export default async function RegisterProButton() {
  const session = await getCurrentSession();

  if (session) return null;

  return (
    <div className='xl:mx-[15px] mx-[30px]'>
      <Button
        asChild
        variant='link'
        className='hidden xl:inline-flex text-green-800 hover:text-green-600 p-0 h-auto font-medium'
      >
        <NextLink href='/register#pro'>Καταχώριση Επαγγελματία</NextLink>
      </Button>
    </div>
  );
}
