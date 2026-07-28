import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ProfileCardProps } from '@/lib/types';

import SaveButton from './save-button';
import UserAvatar from './user-avatar';
import NextLink from './next-link';
import ProfileBadges from './profile-badges';
import RatingDisplay from './rating-display';

export function ProfileCard({ profile }: ProfileCardProps) {
  const {
    id,
    displayName,
    username,
    image,
    subcategory, // Already resolved subcategory label from server action
    tagline,
    rating,
    reviewCount,
    verified = false,
    top = false,
    speciality,
  } = profile;

  return (
    <div className='group relative bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-xl hover:shadow-dark/[0.07] hover:border-fourth/40 hover:-translate-y-1 transition-all duration-300'>
      {/* Whole-card link to the profile page */}
      <NextLink
        href={`/profile/${username}`}
        className='absolute inset-0 z-10'
        aria-label={displayName}
      />

      {/* Save Button */}
      <div className='absolute top-4 right-4 z-20'>
        <SaveButton itemType='profile' itemId={id} />
      </div>

      {/* Avatar Section */}
      <div className='flex flex-col items-center text-center'>
        <div className='relative mb-4'>
          <UserAvatar
            displayName={displayName}
            image={image}
            size='md'
            className='h-20 w-20 rounded-2xl ring-1 ring-black/[0.04] shadow-md transition-transform duration-300 group-hover:scale-105'
            showShadow={false}
          />
        </div>

        {/* Name, Verification and Rating */}
        <div className='flex flex-wrap items-center justify-center gap-2 mb-2'>
          <h3 className='font-bold text-lg text-dark group-hover:text-third transition-colors mb-0'>
            {displayName}
          </h3>
          <ProfileBadges
            verified={verified}
            topLevel={top}
            className='relative z-20'
          />
          <RatingDisplay
            rating={rating}
            reviewCount={reviewCount}
            variant='compact'
            className='text-2sm ml-1'
          />
        </div>

        {/* Subcategory */}
        {subcategory && (
          <div className='mb-3'>
            <Badge
              variant='muted'
              className='rounded-full border-transparent bg-primary/10 text-primary text-xs font-semibold px-2.5 py-0.5'
            >
              {subcategory}
            </Badge>
          </div>
        )}

        {/* Speciality */}
        {speciality ? (
          <div className='mt-3 mb-1'>
            <Badge
              variant='outline'
              className='rounded-full border-gray-200 text-body font-medium text-xs'
            >
              {speciality}
            </Badge>
          </div>
        ) : (
          <div className='h-6 mb-4'></div>
        )}

        {/* View Profile Button */}
        <Button asChild variant='fifth' className='mt-4 relative z-20'>
          <NextLink href={`/profile/${username}`}>Περισσότερα</NextLink>
        </Button>
      </div>
    </div>
  );
}
