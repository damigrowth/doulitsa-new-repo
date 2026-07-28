'use client';

import React from 'react';
import NextLink from '@/components/shared/next-link';
import { usePathname } from 'next/navigation';
import { UserMenuLinkProps } from '@/types/components';

export default function UserMenuLink({ item }: UserMenuLinkProps) {
  const path = usePathname();

  const isProfile = item.path.startsWith('/profile/');

  return (
    <NextLink
      className={`
        w-full px-4 py-2 font-normal text-inherit no-underline rounded
        flex items-center hover:bg-gray-100 hover:text-gray-900
        ${path === item.path ? 'bg-gray-900 text-white' : ''}
        ${item.path === '#' ? 'opacity-50 pointer-events-none' : ''}
      `}
      href={item.path}
      target={isProfile ? '_blank' : undefined}
      rel={isProfile ? 'noopener' : undefined}
    >
      <i className={`${item.icon} mr-3`} />
      <span>{item.name}</span>
    </NextLink>
  );
}
