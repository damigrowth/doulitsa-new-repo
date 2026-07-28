'use client';

import React from 'react';
import Image from 'next/image';
import NextLink from '@/components/shared/next-link';

export default function HeaderLogo() {
  return (
    <div className='logos'>
      <NextLink className='header-logo logo1' href='/'>
        <Image
          width={148}
          height={46}
          src='/doulitsa-logo.svg'
          alt='Doulitsa Logo'
          priority
          loading='eager'
        />
      </NextLink>
    </div>
  );
}
