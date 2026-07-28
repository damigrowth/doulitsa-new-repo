import React from 'react';

import { Home } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { ProfileMetaProps } from '@/lib/types/components';

import {
  getCoverageAddressWithLocation,
  hasOnbaseCoverage,
} from '@/lib/utils/datasets';
import RatingDisplay from '@/components/shared/rating-display';
import UserAvatar from '@/components/shared/user-avatar';
import { VerifiedBadge } from '../shared/profile-badges';
import SocialLinks from '../shared/social-links';



/**
 * Modern ProfileMeta Component
 * Displays the main profile header with avatar, name, rating, and location info
 */

export default function ProfileMeta({
  displayName,
  firstName,
  lastName,
  tagline,
  image,
  rating,
  reviewCount,
  verified,
  top,
  coverage,
  visibility,
  socials,
  subcategory,
}: ProfileMetaProps) {
  return (
    <section>
      <Card className='relative overflow-hidden bg-gradient-to-br from-silver via-white to-white border border-gray-100 rounded-2xl shadow-sm mb-8'>
        {/* Main content */}
        <div className='relative z-10 p-8'>
          <div className='flex flex-col sm:flex-row items-start gap-6'>
            {/* Avatar */}
            <UserAvatar
              displayName={displayName}
              firstName={firstName}
              lastName={lastName}
              image={image}
              top={top}
              size='2xl'
              width={112}
              height={112}
              className='h-28 w-28 rounded-xl ring-1 ring-black/[0.04]'
            />

            {/* Profile info */}
            <div className='flex-1 min-w-0'>
              {/* Name, verification and rating */}
              <div className='flex flex-wrap items-center gap-2 mb-2'>
                <h1 className='text-lg font-bold text-dark mb-0'>
                  {displayName}
                </h1>
                <VerifiedBadge verified={verified} />
                {reviewCount > 0 && (
                  <RatingDisplay
                    rating={rating}
                    reviewCount={reviewCount}
                    variant='compact'
                    href='#review'
                    className='text-sm ml-1'
                  />
                )}
              </div>

              {/* Subcategory */}
              {subcategory?.label && (
                <div className='mt-3 mb-3'>
                  <Badge
                    variant='muted'
                    className='rounded-full border-transparent bg-primary/10 text-primary text-sm font-semibold px-3 py-1'
                  >
                    {subcategory.label}
                  </Badge>
                </div>
              )}

              {/* Tagline below the subcategory */}
              {tagline && (
                <h2 className='text-base font-normal text-gray-600 mb-4 leading-relaxed'>
                  {tagline}
                </h2>
              )}

              {/* Location info */}
              <div className='flex items-center gap-4 text-sm flex-wrap'>
                {/* Address - always shown when onbase coverage exists */}
                {coverage && hasOnbaseCoverage(coverage) && (
                  <div className='flex items-center gap-2 text-muted-foreground'>
                    <Home className='h-4 w-4 text-third' />
                    <span>{getCoverageAddressWithLocation(coverage)}</span>
                  </div>
                )}

              </div>

              {/* Social links */}
              {socials && (
                <div className='mt-4'>
                  <SocialLinks socials={socials} size='lg' debug={true} />
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>
    </section>
  );
}
