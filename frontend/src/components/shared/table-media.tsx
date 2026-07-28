'use client';

import React from 'react';
import Image from 'next/image';
import { FileImage } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getOptimizedImageUrl } from '@/lib/utils/cloudinary';
import type { CloudinaryResource } from '@/lib/types/cloudinary';

interface TableMediaProps {
  media: CloudinaryResource[];
  className?: string;
}

export default function TableMedia({ media, className }: TableMediaProps) {
  // Return fallback if no media
  if (!media || !Array.isArray(media) || media.length === 0) {
    return (
      <div className={cn(
        'w-16 h-12 bg-gray-100 rounded flex items-center justify-center',
        className
      )}>
        <FileImage className='w-6 h-6 text-gray-400' />
      </div>
    );
  }

  // Find the first image in the media array
  const firstImage = media.find(item => item.resource_type === 'image');

  // Return fallback if no image found
  if (!firstImage) {
    return (
      <div className={cn(
        'w-16 h-12 bg-gray-100 rounded flex items-center justify-center',
        className
      )}>
        <FileImage className='w-6 h-6 text-gray-400' />
      </div>
    );
  }

  // Get optimized thumbnail URL (80x80px is appropriate for 64px display)
  const optimizedUrl = getOptimizedImageUrl(firstImage, 'thumbnail');

  // Fallback to original URL if optimization fails
  const imageUrl = optimizedUrl || firstImage.secure_url || firstImage.url;

  // Return fallback if no valid URL
  if (!imageUrl || imageUrl.trim() === '') {
    return (
      <div className={cn(
        'w-16 h-12 bg-gray-100 rounded flex items-center justify-center',
        className
      )}>
        <FileImage className='w-6 h-6 text-gray-400' />
      </div>
    );
  }

  return (
    <div className={cn('w-16 h-12 flex-shrink-0 overflow-hidden', className)}>
      <div className='relative w-full h-full'>
        <Image
          src={imageUrl}
          alt={firstImage.original_filename || 'Service thumbnail'}
          fill
          className='object-cover rounded'
          sizes='64px'
          loading='lazy'
        />
      </div>
    </div>
  );
}