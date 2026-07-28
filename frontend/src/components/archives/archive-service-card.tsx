import { Card } from '@/components/ui/card';
import type { ArchiveServiceCardData } from '@/lib/types/components';
import type { ServiceCardData } from '@/lib/types';
import { cn } from '@/lib/utils';
import { getOptimizedImageUrl } from '@/lib/utils/cloudinary';
import { NextLink } from '@/components';
import ProfileBadges from '@/components/shared/profile-badges';
import RatingDisplay from '@/components/shared/rating-display';
import UserAvatar from '@/components/shared/user-avatar';
import TaxonomiesDisplay from '@/components/shared/taxonomies-display';
import { CoverageDisplay } from './coverage-display';
import { MediaTypeIndicators } from '@/components/shared/media-type-indicators';
import SaveButton from '@/components/shared/save-button';

interface ArchiveServiceCardProps {
  service: ArchiveServiceCardData | ServiceCardData;
  className?: string;
}

export function ArchiveServiceCard({
  service,
  className,
}: ArchiveServiceCardProps) {
  // Check if service has taxonomyLabels (ArchiveServiceCardData) or just category (ServiceCardData)
  const hasDetailedTaxonomies = 'taxonomyLabels' in service;

  // Show subcategory as the main category and subdivision as the subcategory
  const categoryLabel = hasDetailedTaxonomies
    ? service.taxonomyLabels.subcategory
    : (service as ServiceCardData).category;
  const subcategoryLabel = hasDetailedTaxonomies
    ? service.taxonomyLabels.subdivision
    : '';

  // Check if profile has coverage data (might not exist in ServiceCardData)
  const profileCoverage =
    'coverage' in service.profile ? service.profile.coverage : undefined;
  const profileVerified =
    'verified' in service.profile ? service.profile.verified : false;
  const profileTop = 'top' in service.profile ? service.profile.top : false;
  const profileGroupedCoverage =
    'groupedCoverage' in service.profile
      ? service.profile.groupedCoverage
      : [];

  // Check if profile has rating data (might not exist in ServiceCardData)
  const profileRating =
    'rating' in service.profile ? service.profile.rating : 0;
  const profileReviewCount =
    'reviewCount' in service.profile ? service.profile.reviewCount : 0;

  // Convert price to number for reliable comparison
  const priceValue = Number(service?.price) || 0;
  const hasValidPrice = priceValue > 0;

  // Get optimized background image URL for profile section
  const optimizedBgImage = service.profile.image
    ? getOptimizedImageUrl(service.profile.image, 'card')
    : null;

  return (
    <Card
      className={cn(
        'group relative rounded-2xl border-gray-100 shadow-sm hover:shadow-xl hover:shadow-dark/[0.07] hover:border-fourth/40 transition-all duration-300 overflow-hidden',
        className,
      )}
    >
      {/* Whole-card link to the service page */}
      <NextLink
        href={`/s/${service.slug}`}
        className='absolute inset-0 z-10'
        aria-label={service.title}
      />

      {/* Save Button */}
      <div className='absolute top-3 right-3 z-20'>
        <SaveButton itemType='service' itemId={service.id} ownerId={service.profile.uid} />
      </div>

      <div className='flex flex-col md:flex-row h-full md:h-52'>
        {/* Profile Image Section - Left side */}
        <div className='w-full md:w-48 flex-shrink-0 relative overflow-hidden flex md:items-center md:justify-center pl-5 md:pl-0 bg-gradient-to-br from-bluey via-white to-silver min-h-28'>
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
              displayName={service.profile.displayName}
              image={service.profile.image}
              top={profileTop}
              size='lg'
              className='h-32 w-32 rounded-xl ring-1 ring-black/[0.04] shadow-md transition-transform duration-300 group-hover:scale-105'
              showShadow={false}
            />
          </div>

        </div>

        {/* Content Section */}
        <div className='flex-1 px-6 py-4 pb-6 flex flex-col justify-between min-w-0'>
          <div className='space-y-2'>
            {/* Title */}
            <div className='flex items-center gap-3 mb-2'>
              <h3 className='text-lg font-semibold text-dark line-clamp-2 group-hover:text-third transition-colors mb-0'>
                {service.title}
              </h3>
              <MediaTypeIndicators media={service.media} className='shrink-0' />
            </div>

            {/* Category Display */}
            <TaxonomiesDisplay
              taxonomyLabels={{
                category: '',
                subcategory: categoryLabel || '',
                subdivision: subcategoryLabel || '',
              }}
              variant='badge'
            />
          </div>

          {/* Bottom Section */}
          <div className='mt-3'>
            {/* Coverage + Media Icons */}
            {profileCoverage && (
              <div className='mb-3 flex items-center gap-4 relative z-20 w-fit max-w-full'>
                <CoverageDisplay
                  online={service.type?.online}
                  onbase={service.type?.onbase}
                  onsite={service.type?.onsite}
                  area={profileCoverage?.area}
                  county={profileCoverage?.county}
                  groupedCoverage={profileGroupedCoverage}
                  variant='compact'
                  className='text-sm'
                />
              </div>
            )}

            {/* Bottom bar with profile info + rating (left) and price (right) */}
            <div className='flex items-center gap-3 border-t border-gray-100 pt-3'>
              <div className='flex items-center gap-2 flex-1 min-w-0'>
                <NextLink
                  href={`/profile/${service.profile.username}`}
                  className='group/profile relative z-20 min-w-0 block truncate'
                >
                  <span className='text-sm font-semibold text-body group-hover/profile:text-third transition-colors'>
                    {service.profile.displayName}
                  </span>
                </NextLink>
                <ProfileBadges
                  verified={profileVerified}
                  topLevel={profileTop}
                  className='relative z-20 shrink-0'
                />

                {/* Rating */}
                {profileReviewCount > 0 && (
                  <RatingDisplay
                    rating={profileRating}
                    reviewCount={profileReviewCount}
                    size='sm'
                    variant='compact'
                    className='text-sm shrink-0 ml-1'
                  />
                )}
              </div>

              {/* Price */}
              {hasValidPrice && (
                <div className='flex-shrink-0 flex items-baseline gap-1 whitespace-nowrap'>
                  <span className='text-xs text-muted-foreground'>από</span>
                  <span className='font-bold text-dark text-lg'>
                    {priceValue}€
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
