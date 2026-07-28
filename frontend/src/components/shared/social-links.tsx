import React from 'react';
import { Icon } from '@/components/icon/brands';
import { cn } from '@/lib/utils';

export interface SocialLinksProps {
  /** Social media links object */
  socials: AppJson.SocialMedia;
  /** Size variant of the icons */
  size?: 'sm' | 'md' | 'lg';
  /** Custom class name */
  className?: string;
  /** Whether to show debug info in development */
  debug?: boolean;
}

const sizeClasses = {
  sm: 12,
  md: 16,
  lg: 20,
};

const getSocialIcon = (platform: string, size: number) => {
  return <Icon name={platform.toLowerCase()} size={size} />;
};

const getSocialColor = (platform: string) => {
  switch (platform.toLowerCase()) {
    case 'facebook':
      return 'hover:text-[#1877F2]';
    case 'linkedin':
      return 'hover:text-[#0A66C2]';
    case 'x':
    case 'twitter':
      return 'hover:text-[#1DA1F2]';
    case 'youtube':
      return 'hover:text-[#FF0000]';
    case 'github':
      return 'hover:text-[#333333]';
    case 'instagram':
      return 'hover:text-[#E4405F]';
    case 'behance':
      return 'hover:text-[#1769FF]';
    case 'dribbble':
      return 'hover:text-[#EA4C89]';
    case 'pinterest':
      return 'hover:text-[#BD081C]';
    case 'vimeo':
      return 'hover:text-[#1AB7EA]';
    case 'tiktok':
      return 'hover:text-[#000000]';
    default:
      return 'hover:text-primary';
  }
};

export default function SocialLinks({
  socials,
  size = 'md',
  className,
  debug = false,
}: SocialLinksProps) {
  if (!socials || Object.keys(socials).length === 0) {
    return null;
  }

  const iconSize = sizeClasses[size];

  return (
    <div>
      <div className={cn('flex items-center gap-3', className)}>
        {Object.entries(socials).map(([platform, url]) => {
          if (!url) {
            return null;
          }

          return (
            <a
              key={platform}
              href={url}
              target='_blank'
              rel='noopener noreferrer'
              className={cn(
                'text-muted-foreground transition-colors',
                getSocialColor(platform),
              )}
              title={`${platform.charAt(0).toUpperCase() + platform.slice(1)} Profile`}
            >
              {getSocialIcon(platform, iconSize)}
            </a>
          );
        })}
      </div>
    </div>
  );
}
