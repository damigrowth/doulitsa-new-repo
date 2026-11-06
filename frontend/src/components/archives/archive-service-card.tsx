import { Card } from '@/components/ui/card';
import type { ArchiveServiceCardData } from '@/lib/types/components';
import type { ServiceCardData } from '@/lib/types';
import { cn } from '@/lib/utils';
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

  return (
    <Card
      className={cn(
        'group relative rounded-2xl border-gray-200 shadow-[0_1px_2px_rgba(16,31,60,0.04),0_2px_6px_rgba(16,31,60,0.05)] hover:shadow-xl hover:shadow-dark/[0.07] hover:border-fourth/50 hover:-translate-y-0.5 transition-all duration-300 overflow-hidden',
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
      <div className='absolute top-4 right-4 z-20'>
        <SaveButton itemType='service' itemId={service.id} ownerId={service.profile.uid} />
      </div>

      <div className='px-6 pt-5 pb-4'>
        {/* Service identity: title is the dominant element of the card */}
        <div className='space-y-2 pr-12'>
          <div className='flex items-center gap-3'>
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

        {/* Coverage */}
        {profileCoverage && (
          <div className='mt-3 flex items-center gap-4 relative z-20 w-fit max-w-full'>
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
      </div>

      {/* Footer strip: tinted band that visually closes the card and separates it from the page background */}
      <div className='flex items-center gap-3 border-t border-gray-100 bg-gray-50 px-6 py-3'>
        <div className='flex items-center gap-2.5 flex-1 min-w-0'>
          <NextLink
            href={`/profile/${service.profile.username}`}
            className='group/profile relative z-20 flex items-center gap-2.5 min-w-0'
          >
            <UserAvatar
              displayName={service.profile.displayName}
              image={service.profile.image}
              size='sm'
              className='h-9 w-9 rounded-lg ring-1 ring-black/[0.06] shrink-0'
              showBorder={false}
              showShadow={false}
            />
            <span className='text-sm font-semibold text-body group-hover/profile:text-third transition-colors truncate'>
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
    </Card>
  );
}
