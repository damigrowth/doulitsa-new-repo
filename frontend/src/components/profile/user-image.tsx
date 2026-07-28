import React from 'react';
import Image from 'next/image';
import NextLink from '@/components/shared/next-link';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { getOptimizedImageUrl } from '@/lib/utils/cloudinary';

interface UserImageProps {
  image?: string | null;
  width?: number;
  height?: number;
  alt?: string;
  firstName?: string | null;
  lastName?: string | null;
  displayName?: string | null;
  hideDisplayName?: boolean;
  bigText?: boolean;
  path?: string;
  topLevel?: boolean;
  className?: string;
}

export default function UserImage({
  image,
  width = 40,
  height = 40,
  alt,
  firstName,
  lastName,
  displayName,
  hideDisplayName = false,
  bigText = false,
  path,
  topLevel = false,
  className,
}: UserImageProps) {
  const badgeElement = topLevel && (
    <div className='absolute z-10 -top-1 -right-1'>
      <Tooltip>
        <TooltipTrigger asChild>
          <Image
            width={30}
            height={30}
            src='https://res.cloudinary.com/ddejhvzbf/image/upload/v1750076624/Static/top-badge_rajlxi.webp'
            alt='top badge'
            className='cursor-pointer'
          />
        </TooltipTrigger>
        <TooltipContent>
          <p>Έχει λάβει εξαιρετικές αξιολογήσεις</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );

  const getInitials = () => {
    if (firstName && lastName) {
      return (
        firstName.slice(0, 1).toUpperCase() + lastName.slice(0, 1).toUpperCase()
      );
    }
    if (displayName) {
      const names = displayName.split(' ');
      return names.length > 1
        ? names[0].slice(0, 1).toUpperCase() +
            names[1].slice(0, 1).toUpperCase()
        : displayName.slice(0, 2).toUpperCase();
    }
    return '?';
  };

  const getFontSize = () => {
    if (bigText) return 'text-4xl';
    if (width >= 80) return 'text-xl';
    if (width >= 60) return 'text-lg';
    return 'text-lg';
  };

  // Determine optimal avatar size preset based on display width
  const getAvatarSizePreset = (displayWidth: number): 'sm' | 'md' | 'lg' | 'xl' | '2xl' => {
    if (displayWidth <= 50) return 'sm';   // 50×50px
    if (displayWidth <= 100) return 'md';  // 100×100px
    if (displayWidth <= 150) return 'lg';  // 150×150px
    if (displayWidth <= 200) return 'xl';  // 200×200px
    return '2xl'; // 300×300px
  };

  const avatarSizePreset = getAvatarSizePreset(width);

  // Get optimized avatar image URL with appropriate size preset
  const optimizedImage = image
    ? getOptimizedImageUrl(image, 'avatar', avatarSizePreset) || image
    : null;

  const avatarElement = (
    <Avatar
      className={cn('relative rounded-md', className)}
      style={{ width, height }}
    >
      {optimizedImage ? (
        <AvatarImage
          src={optimizedImage}
          alt={alt || 'profile-image'}
          className='object-cover'
        />
      ) : null}
      <AvatarFallback
        className={cn(
          'rounded-md text-center leading-none -mt-px font-medium text-gray-600',
          getFontSize(),
        )}
      >
        {getInitials()}
      </AvatarFallback>
      {badgeElement}
    </Avatar>
  );

  const content = (
    <div className='flex items-center'>
      {avatarElement}
      {displayName && !hideDisplayName && (
        <span className='text-sm leading-normal ml-3 xs:ml-2 font-medium text-gray-700'>
          {displayName}
        </span>
      )}
    </div>
  );

  return (
    <div className='user-image-container'>
      {path ? (
        <NextLink
          href={path}
          className='flex justify-center items-center hover:opacity-80 transition-opacity'
        >
          {content}
        </NextLink>
      ) : (
        content
      )}
    </div>
  );
}
