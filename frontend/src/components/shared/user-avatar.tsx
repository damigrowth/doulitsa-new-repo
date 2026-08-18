import React from 'react';
import { Shield } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { getOptimizedImageUrl, IMAGE_SIZES } from '@/lib/utils/cloudinary';
import NextLink from './next-link';

export interface UserAvatarProps {
  /** Display name */
  displayName?: string;
  /** First name */
  firstName?: string;
  /** Last name */
  lastName?: string;
  /** Avatar image (CloudinaryResource or URL string) */
  image?: AppJson.CloudinaryResource | string;
  /** Whether user has top status */
  top?: boolean;
  /** Size variant of the avatar */
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  /** Custom class name */
  className?: string;
  /** Show border */
  showBorder?: boolean;
  /** Custom top icon */
  topIcon?: React.ReactNode;
  /** Custom fallback content */
  fallback?: string;
  /** Optional href to make avatar clickable */
  href?: string;
  /** Hide display name (for compatibility with UserImage) */
  hideDisplayName?: boolean;
  /** Custom width in pixels (overrides size) */
  width?: number;
  /** Custom height in pixels (overrides size) */
  height?: number;
  /** Show shadow */
  showShadow?: boolean;
  /** Image loading strategy */
  loading?: 'eager' | 'lazy';
}

const sizeClasses = {
  sm: 'h-8 w-8',
  md: 'h-12 w-12',
  lg: 'h-16 w-16',
  xl: 'h-20 w-20',
  '2xl': 'h-[120px] w-[120px]',
};

const borderClasses = {
  sm: 'border-2',
  md: 'border-2',
  lg: 'border-4',
  xl: 'border-4',
  '2xl': 'border-4',
};

const fallbackSizeClasses = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-lg',
  xl: 'text-lg',
  '2xl': 'text-2xl',
};

const topIconSizeClasses = {
  sm: 'h-2 w-2',
  md: 'h-3 w-3',
  lg: 'h-3 w-3',
  xl: 'h-3 w-3',
  '2xl': 'h-4 w-4',
};

/**
 * Generate initials from name fields
 */
function getUserInitials(
  displayName?: string,
  firstName?: string,
  lastName?: string,
): string {
  if (displayName) {
    const parts = displayName.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return displayName.substring(0, 2).toUpperCase();
  }

  const initials = [firstName, lastName]
    .filter(Boolean)
    .map((name) => name![0])
    .join('')
    .toUpperCase();

  return initials || '?';
}

export default function UserAvatar({
  displayName,
  firstName,
  lastName,
  image,
  top,
  size = 'xl',
  className,
  showBorder = true,
  topIcon,
  fallback,
  href,
  hideDisplayName,
  width,
  height,
  showShadow = true,
  loading = 'lazy',
}: UserAvatarProps) {
  const sizeClass = sizeClasses[size];
  const borderClass = showBorder ? borderClasses[size] : '';
  const fallbackSizeClass = fallbackSizeClasses[size];
  const topIconSizeClass = topIconSizeClasses[size];

  // Determine optimal avatar size preset based on display size
  // This ensures we load the smallest optimized image for the actual display size
  const getAvatarSizePreset = (
    displayWidth?: number,
    displaySize?: UserAvatarProps['size']
  ): keyof typeof IMAGE_SIZES.avatar => {
    // If custom width is provided, use it for precise optimization
    if (displayWidth !== undefined) {
      if (displayWidth <= 50) return 'sm';   // 50×50px
      if (displayWidth <= 100) return 'md';  // 100×100px
      if (displayWidth <= 150) return 'lg';  // 150×150px
      if (displayWidth <= 200) return 'xl';  // 200×200px
      return '2xl'; // 300×300px
    }

    // Otherwise, map size prop to appropriate preset
    switch (displaySize) {
      case 'sm': return 'sm';   // 32px → 50px
      case 'md': return 'md';   // 48px → 100px
      case 'lg': return 'lg';   // 64px → 150px
      case 'xl': return 'xl';   // 80px → 200px
      case '2xl': return '2xl'; // 120px → 300px
      default: return 'lg';
    }
  };

  const avatarSizePreset = getAvatarSizePreset(width, size);

  // Get optimized image URL based on avatar size
  // Uses Cloudinary transformations for significant bandwidth savings (90%+)
  const imageUrl = image
    ? getOptimizedImageUrl(image, 'avatar', avatarSizePreset) ||
      // Fallback to original URL for non-Cloudinary images (e.g., OAuth avatars)
      (typeof image === 'object' && image?.secure_url
        ? image.secure_url
        : typeof image === 'string'
        ? image
        : undefined)
    : undefined;

  const initials =
    fallback || getUserInitials(displayName, firstName, lastName);
  const altText =
    displayName ||
    `${firstName || ''} ${lastName || ''}`.trim() ||
    'User avatar';

  // Generate custom size classes if width/height are provided
  const customSizeClass =
    width && height ? `w-[${width}px] h-[${height}px]` : undefined;

  const avatarContent = (
    <div className='relative'>
      <Avatar
        className={cn(
          customSizeClass || sizeClass,
          borderClass,
          'border-background rounded-lg bg-white',
          showShadow && 'shadow-lg',
          className,
        )}
      >
        {/* Radix AvatarImage tracks the real load state, so the initials
            fallback below is rendered ONLY while the image is missing/loading
            or if it errors — never underneath a loaded image. (A previous
            version used a plain <img> on top of an always-rendered fallback:
            for logos that are transparent PNGs the initials bled through the
            transparent areas.) `referrerPolicy='no-referrer'` is forwarded to
            Radix's preflight loader as well, which is what makes cross-origin
            Google profile pictures load correctly. */}
        {imageUrl && (
          <AvatarImage
            src={imageUrl}
            alt={altText}
            loading={loading}
            referrerPolicy='no-referrer'
            className='aspect-square h-full w-full rounded-lg object-cover'
          />
        )}
        {/* With an image: wait briefly before showing initials so a fast load
            never flashes them (and, server-side, render nothing until the
            client knows the load state). Without an image: render initials
            immediately, including in the SSR HTML. */}
        <AvatarFallback className='rounded-lg' delayMs={imageUrl ? 150 : undefined}>
          <div
            className={cn(
              fallbackSizeClass,
              'font-semibold bg-primary text-primary-foreground rounded-lg w-full h-full flex items-center justify-center',
            )}
          >
            {initials}
          </div>
        </AvatarFallback>
      </Avatar>

      {top && (
        <div className='absolute -top-1 -right-1 bg-yellow-500 rounded-full p-1 border-2 border-background'>
          {topIcon || <Shield className={cn(topIconSizeClass, 'text-white')} />}
        </div>
      )}
    </div>
  );

  if (href) {
    return (
      <NextLink href={href} className='hover:opacity-80 transition-opacity'>
        {avatarContent}
      </NextLink>
    );
  }

  return avatarContent;
}
