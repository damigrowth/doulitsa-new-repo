import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CoverageDisplay } from './coverage-display';
import type { ArchiveProfileCardData } from '@/lib/types/components';
import { cn } from '@/lib/utils';
import { getOptimizedImageUrl } from '@/lib/utils/cloudinary';
import { NextLink } from '@/components';
import UserAvatar from '@/components/shared/user-avatar';
import ProfileBadges from '@/components/shared/profile-badges';
import RatingDisplay from '@/components/shared/rating-display';
import SaveButton from '@/components/shared/save-button';

interface ArchiveProfileCardProps {
  profile: ArchiveProfileCardData;
  variant?: 'horizontal' | 'vertical';
  className?: string;
}

export function ArchiveProfileCard({
  profile,
  variant = 'horizontal',
  className,
}: ArchiveProfileCardProps) {
  // Get optimized background image URL
  const optimizedBgImage = profile.image
    ? getOptimizedImageUrl(profile.image, 'card')
    : null;

  return (
    <Card
      className={cn(
        'group relative rounded-2xl border-gray-100 shadow-sm hover:shadow-xl hover:shadow-dark/[0.07] hover:border-fourth/40 transition-all duration-300 overflow-hidden h-full',
        className,
      )}
    >
      {/* Whole-card link to the profile page */}
      <NextLink
        href={`/profile/${profile.username}`}
        className='absolute inset-0 z-10'
        aria-label={profile.displayName}
      />

      {/* Save Button */}
      <div className='absolute top-3 right-3 z-20'>
        <SaveButton itemType='profile' itemId={profile.id} ownerId={profile.uid} />
      </div>

      <div className={cn(
        'flex flex-col h-full',
        variant === 'horizontal' && 'md:flex-row md:h-52',
      )}>
        {/* Avatar Section */}
        <div
          className={cn(
            'w-full flex-shrink-0 relative overflow-hidden flex bg-gradient-to-br from-bluey via-white to-silver min-h-28',
            variant === 'horizontal'
              ? 'md:w-48 md:items-center md:justify-center pl-5 md:pl-0'
              : 'pl-5',
          )}
        >
          {/* Blurred, desaturated profile image backdrop (oversized so the blur reaches the rounded corners) */}
          {optimizedBgImage && (
            <div
              aria-hidden
              className='absolute -inset-4 bg-cover bg-center blur-md saturate-[.35] opacity-30 group-hover:saturate-100 group-hover:opacity-40 transition-all duration-300'
              style={{ backgroundImage: `url(${optimizedBgImage})` }}
            ></div>
          )}

          {/* Avatar on top */}
          <div className='relative flex items-center justify-center py-4'>
            <UserAvatar
              displayName={profile.displayName}
              image={profile.image}
              top={profile.top}
              size='lg'
              className='h-32 w-32 rounded-xl ring-1 ring-black/[0.04] shadow-md transition-transform duration-300 group-hover:scale-105'
              showShadow={false}
            />
          </div>
        </div>

        {/* Content Section */}
        <div className='flex-1 px-6 py-4 pb-6 flex flex-col justify-between min-w-0'>
          <div className='space-y-2'>
            <div className='flex flex-wrap items-center gap-2 mb-2'>
              <h3 className='text-lg font-semibold text-dark line-clamp-2 group-hover:text-third transition-colors mb-0'>
                {profile.displayName}
              </h3>
              <ProfileBadges
                verified={profile.verified}
                topLevel={profile.top}
                className='relative z-20'
              />
              {profile.reviewCount > 0 && (
                <RatingDisplay
                  rating={profile.rating}
                  reviewCount={profile.reviewCount}
                  size='sm'
                  variant='compact'
                  className='text-sm ml-1'
                />
              )}
            </div>

            {/* Subcategory */}
            {profile.taxonomyLabels?.subcategory && (
              <div>
                <Badge
                  variant='muted'
                  className='rounded-full border-transparent bg-primary/10 text-primary text-xs font-semibold px-2.5 py-0.5'
                >
                  {profile.taxonomyLabels.subcategory}
                </Badge>
              </div>
            )}
          </div>

          {/* Bottom Section */}
          <div className='mt-4'>
            {/* Skills and Speciality */}
            {((profile.skillsData?.length ?? 0) > 0 ||
              profile.specialityData) &&
              (() => {
                const filteredSkills = (profile.skillsData ?? []).filter(
                  (skill) => skill.label !== profile.specialityData?.label,
                );
                const maxVisible = variant === 'vertical' ? 1 : 2;

                return (
                  <div className='flex items-center gap-2 flex-nowrap overflow-hidden mb-3'>
                    {profile.specialityData && (
                      <Badge
                        variant='outline'
                        className='rounded-full border-gray-200 text-body font-medium flex-shrink-0'
                      >
                        {profile.specialityData.label}
                      </Badge>
                    )}
                    {filteredSkills.length > 0 && (
                      <>
                        {filteredSkills.slice(0, maxVisible).map((skill) => (
                          <Badge
                            key={skill.id}
                            variant='outline'
                            className='rounded-full border-gray-200 text-body font-medium flex-shrink-0'
                          >
                            {skill.label}
                          </Badge>
                        ))}
                        {filteredSkills.length > maxVisible && (
                          <Badge variant='muted' className='flex-shrink-0 px-0 py-0 text-xs min-w-0 border-0 bg-transparent'>
                            +{filteredSkills.length - maxVisible}
                          </Badge>
                        )}
                      </>
                    )}
                  </div>
                );
              })()}

            {/* Coverage - consistent footer, above the card link for popover interaction.
                On the vertical variant, min-h reserves two lines so side-by-side
                card footers stay aligned; stacked horizontal cards don't need it */}
            <div className='border-t border-gray-100 pt-3'>
              <div
                className={cn(
                  'relative z-20 w-fit max-w-full',
                  variant === 'vertical' && 'min-h-[2.5rem]',
                )}
              >
                <CoverageDisplay
                  online={profile.coverage?.online}
                  onbase={profile.coverage?.onbase}
                  onsite={profile.coverage?.onsite}
                  area={profile.coverage?.area}
                  county={profile.coverage?.county}
                  groupedCoverage={profile.groupedCoverage || []}
                  variant='compact'
                  className='text-sm'
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
