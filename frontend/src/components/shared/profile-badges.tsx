import React from 'react';
import Image from 'next/image';
import { ShieldCheck, Star, Globe } from 'lucide-react';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip';
import { buildCloudinaryUrl, extractPublicId } from '@/lib/utils/cloudinary';

interface ProfileBadgesProps {
  verified?: boolean;
  topLevel?: boolean;
  featured?: boolean;
  published?: boolean;
  className?: string;
}

export default function ProfileBadges({
  verified = false,
  topLevel = false,
  featured = false,
  published = false,
  className = '',
}: ProfileBadgesProps) {
  if (!verified && !topLevel && !featured && !published) {
    return null;
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <PublishedBadge published={published} />
      <FeaturedBadge featured={featured} />
      <VerifiedBadge verified={verified} />
      <TopLevelBadge topLevel={topLevel} />
    </div>
  );
}

// Individual badge components for specific use cases
export function VerifiedBadge({ verified }: { verified?: boolean }) {
  if (!verified) return null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <ShieldCheck className='h-6 w-6 text-white fill-secondary cursor-pointer' />
      </TooltipTrigger>
      <TooltipContent>
        <p>Πιστοποιημένος Επαγγελματικός Λογαριασμός</p>
      </TooltipContent>
    </Tooltip>
  );
}

export function TopLevelBadge({ topLevel }: { topLevel?: boolean }) {
  if (!topLevel) return null;

  const badgeUrl = React.useMemo(() => {
    const url =
      'https://res.cloudinary.com/ddejhvzbf/image/upload/v1750076624/Static/top-badge_rajlxi.webp';
    const publicId = extractPublicId(url);
    return publicId
      ? buildCloudinaryUrl(publicId, {
          width: 40,
          height: 40,
          crop: 'fill',
          quality: 'auto:good',
          format: 'auto',
          dpr: 'auto',
        })
      : url;
  }, []);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Image
          width={20}
          height={20}
          src={badgeUrl}
          alt='top badge'
          className='cursor-pointer'
        />
      </TooltipTrigger>
      <TooltipContent>
        <p>Έχει λάβει εξαιρετικές αξιολογήσεις</p>
      </TooltipContent>
    </Tooltip>
  );
}

export function FeaturedBadge({ featured }: { featured?: boolean }) {
  if (!featured) return null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Star className='h-5 w-5 text-yellow-500 fill-yellow-500 cursor-pointer' />
      </TooltipTrigger>
      <TooltipContent>
        <p>Featured</p>
      </TooltipContent>
    </Tooltip>
  );
}

export function PublishedBadge({ published }: { published?: boolean }) {
  if (!published) return null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Globe className='h-5 w-5 text-green-600 cursor-pointer' />
      </TooltipTrigger>
      <TooltipContent>
        <p>Δημοσιευμένο</p>
      </TooltipContent>
    </Tooltip>
  );
}
