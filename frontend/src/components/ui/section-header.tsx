import React from 'react';
import { ArrowRight } from 'lucide-react';
import { NextLink } from '@/components';

interface SectionHeaderProps {
  title: string;
  description?: string;
  linkHref?: string;
  linkText?: string;
  className?: string;
}

export function SectionHeader({
  title,
  description,
  linkHref,
  linkText,
  className = '',
}: SectionHeaderProps) {
  return (
    <div
      className={`flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 sm:gap-6 md:gap-8 mb-6 sm:mb-8 md:mb-12 ${className}`}
    >
      {/* Left Side - Title & Description */}
      <div className='flex-1 lg:max-w-2xl'>
        <h2 className='text-2xl font-bold text-gray-900 mb-2'>{title}</h2>
        {description && (
          <p className='text-sm font-normal text-gray-600 mb-4'>
            {description}
          </p>
        )}
      </div>

      {/* Right Side - Link Button */}
      {linkHref && linkText && (
        <div className='flex-shrink-0'>
          <NextLink
            href={linkHref}
            className='inline-flex items-center gap-2 text-gray-800 hover:text-primary transition-all duration-300 text-sm font-medium'
          >
            {linkText}
            <ArrowRight className='h-4 w-4' />
          </NextLink>
        </div>
      )}
    </div>
  );
}
