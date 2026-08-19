import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

import SaveButton from './save-button';
import TaxonomiesDisplay from './taxonomies-display';
import { VerifiedBadge } from './profile-badges';
import UserAvatar from './user-avatar';
import { ServiceCardData } from '@/lib/types';
import NextLink from './next-link';
import RatingDisplay from './rating-display';
import { MediaTypeIndicators } from './media-type-indicators';
import { CoverageDisplay } from '@/components/archives/coverage-display';
import { getOptimizedImageUrl } from '@/lib/utils/cloudinary';

interface ServiceCardProps {
  service: ServiceCardData;
  showProfile?: boolean;
  hideDisplayName?: boolean;
}

export default function ServiceCard({
  service,
  showProfile = true,
  hideDisplayName = false,
}: ServiceCardProps) {
  // Convert price to number for reliable comparison
  const priceValue = Number(service?.price) || 0;
  const hasValidPrice = priceValue > 0;

  // Build taxonomy labels for badge display
  const badgeTaxonomyLabels = {
    category: '',
    subcategory:
      service.taxonomyLabels?.subcategory ||
      service.taxonomyLabels?.category ||
      service.category ||
      '',
    subdivision: service.taxonomyLabels?.subdivision || '',
  };

  // Get optimized background image URL for profile section
  const optimizedBgImage = service.profile?.image
    ? getOptimizedImageUrl(service.profile?.image, 'card')
    : null;

  return (
    <Card className='group overflow-hidden border border-gray-200 shadow-[0_1px_2px_rgba(16,31,60,0.04),0_2px_6px_rgba(16,31,60,0.05)] hover:shadow-xl hover:shadow-dark/[0.07] hover:border-fourth/50 hover:-translate-y-1 transition-all duration-300 rounded-2xl bg-white relative h-full flex flex-col'>
      {/* Whole-card link to the service page */}
      <NextLink
        href={`/s/${service.slug}`}
        className='absolute inset-0 z-10'
        aria-label={service.title}
      />

      {/* Save Button - Positioned absolutely over card */}
      <div className='absolute top-4 right-4 z-20'>
        <SaveButton
          itemType='service'
          itemId={service.id}
          ownerId={service.profile?.uid}
        />
      </div>

      {/* Profile Image Section - Replaces media */}
      <div className='relative h-28 bg-gradient-to-br from-bluey via-white to-silver overflow-hidden flex items-end pl-5'>
        {/* Blurred, desaturated profile image backdrop (oversized so the blur reaches the rounded corners) */}
        {optimizedBgImage && (
          <div
            aria-hidden
            className='absolute -inset-4 bg-cover bg-center blur-md saturate-[.35] opacity-30 group-hover:saturate-100 group-hover:opacity-40 transition-all duration-300'
            style={{ backgroundImage: `url(${optimizedBgImage})` }}
          ></div>
        )}

        {/* Avatar */}
        <div className='relative flex items-center justify-center py-4'>
          <UserAvatar
            displayName={service.profile?.displayName}
            image={service.profile?.image}
            size='lg'
            className='h-20 w-20 rounded-xl ring-1 ring-black/[0.04] shadow-md transition-transform duration-300 group-hover:scale-105'
            showShadow={false}
          />
        </div>

        {/* Price chip */}
        {hasValidPrice && (
          <div className='absolute bottom-3 right-3 flex items-baseline gap-1 whitespace-nowrap rounded-full bg-white/95 px-2.5 py-1 shadow-sm ring-1 ring-black/[0.04]'>
            <span className='text-xs text-muted-foreground'>από</span>
            <span className='text-sm font-bold text-dark'>{priceValue}€</span>
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className='flex-1'>
        <CardContent className='p-4 flex flex-col h-full'>
          {/* Title + media type icons */}
          <div className='flex items-start gap-2 mb-3'>
            <h3 className='flex-1 min-w-0 font-semibold text-dark leading-tight text-base group-hover:text-third transition-colors mb-0'>
              <span className='line-clamp-2'>{service.title}</span>
            </h3>
            <MediaTypeIndicators media={service.media} className='shrink-0 mt-0.5' />
          </div>

          {/* Category */}
          <div className='mb-2'>
            <TaxonomiesDisplay
              taxonomyLabels={badgeTaxonomyLabels}
              variant='badge'
            />
          </div>

        </CardContent>
      </div>

      {/* Coverage Display - Above the card link to allow popover interaction.
          min-h reserves two lines so card footers stay aligned in grids */}
      <div className='px-4 pb-3 min-h-[3.25rem] relative z-20 w-fit max-w-full'>
        <CoverageDisplay
          online={service.profile?.coverage?.online}
          onbase={service.profile?.coverage?.onbase}
          onsite={service.profile?.coverage?.onsite}
          area={service.profile?.coverage?.area}
          county={service.profile?.coverage?.county}
          groupedCoverage={service.profile?.groupedCoverage || []}
          variant='compact'
          className='text-sm'
        />
      </div>

      {/* Footer section - Outside main link */}
      {showProfile && (
        <CardContent className='p-4 pt-0'>
          <div className='border-t border-gray-100 pt-3'>
            <div className='flex items-center gap-2 min-w-0'>
              {!hideDisplayName && (
                <>
                  <NextLink
                    href={`/profile/${service.profile?.username ?? ''}`}
                    className='group/profile min-w-0 block truncate relative z-20'
                  >
                    <span className='text-sm font-semibold text-body group-hover/profile:text-third transition-colors'>
                      {service.profile?.displayName}
                    </span>
                  </NextLink>
                  {service.profile?.verified && (
                    <div className='relative z-20 shrink-0'>
                      <VerifiedBadge verified />
                    </div>
                  )}
                </>
              )}

              {/* Rating - after the profile name and badges */}
              {service.reviewCount > 0 && (
                <RatingDisplay
                  rating={service.rating}
                  reviewCount={service.reviewCount}
                  size='sm'
                  variant='compact'
                  className='text-sm shrink-0 ml-1'
                />
              )}
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
