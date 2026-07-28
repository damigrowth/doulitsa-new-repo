import { Card } from '@/components/ui/card';
import TaxonomiesDisplay from '@/components/shared/taxonomies-display';
import type { ServiceCardData } from '@/lib/types';
import { cn } from '@/lib/utils';
import { NextLink } from '@/components';
import MediaCarousel from '@/components/shared/media-carousel';
import { MediaTypeIndicators } from '@/components/shared/media-type-indicators';
import { getServiceDisplayMedia } from '@/lib/utils/media';

interface ServiceMediaCardProps {
  service: ServiceCardData;
  className?: string;
}

/**
 * Horizontal service card with media carousel on the right.
 * Used on the profile page where profile info is already visible.
 */
export function ServiceMediaCard({
  service,
  className,
}: ServiceMediaCardProps) {
  // Convert price to number for reliable comparison
  const priceValue = Number(service?.price) || 0;
  const hasValidPrice = priceValue > 0;

  // Merge service media with profile portfolio (portfolio as fallback).
  // `service.profile` may be undefined when the backend serializer doesn't
  // expand the relation (lighter list payloads), so guard before using `in`.
  const profilePortfolio =
    service.profile && 'portfolio' in service.profile
      ? service.profile.portfolio
      : undefined;
  const displayMedia = getServiceDisplayMedia(service.media, profilePortfolio);

  return (
    <Card
      className={cn(
        'group rounded-2xl border-gray-100 shadow-sm hover:shadow-xl hover:shadow-dark/[0.07] hover:border-fourth/40 transition-all duration-300 overflow-hidden',
        className,
      )}
    >
      <div
        className={cn(
          'flex flex-col md:flex-row h-full',
          displayMedia.length > 0 && 'md:h-52',
        )}
      >
        {/* Media Section - Shows first on mobile, second on desktop */}
        {displayMedia.length > 0 && (
          <NextLink
            href={`/s/${service.slug}`}
            className='w-full md:w-96 flex-shrink-0 relative overflow-hidden md:order-2'
          >
            <MediaCarousel
              media={displayMedia}
              className='w-full h-full'
              compactMode={true}
              showThumbnails={false}
              showControls={true}
              aspectRatio='video'
              noAudioFiles={true}
            />
          </NextLink>
        )}

        {/* Content Section - Shows second on mobile, first on desktop */}
        <div className='flex-1 px-6 pt-4 pb-3 flex flex-col justify-between min-w-0 md:order-1'>
          <div className='space-y-2'>
            <NextLink href={`/s/${service.slug}`} className='block'>
              <h3 className='text-lg font-semibold text-dark line-clamp-2 hover:text-third transition-colors mb-2'>
                {service.title}
              </h3>
            </NextLink>

            {/* Category Display */}
            <TaxonomiesDisplay
              taxonomyLabels={{
                category: '',
                subcategory: service.taxonomyLabels?.subcategory || service.category || '',
                subdivision: service.taxonomyLabels?.subdivision || '',
              }}
              variant='badge'
            />
          </div>

          {/* Bottom Section */}
          <div className='mt-3'>
            {/* Bottom bar with price (left) and media icons (right) */}
            <div className='flex items-center gap-3 border-t border-gray-100 pt-3'>
              {/* Price */}
              <div className='flex-1'>
                {hasValidPrice && (
                  <span className='inline-flex items-baseline gap-1 whitespace-nowrap'>
                    <span className='text-xs text-muted-foreground'>από</span>
                    <span className='font-bold text-dark text-lg'>
                      {priceValue}€
                    </span>
                  </span>
                )}
              </div>

              {/* Media Type Indicators - always on the right */}
              <MediaTypeIndicators media={service.media} />
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
