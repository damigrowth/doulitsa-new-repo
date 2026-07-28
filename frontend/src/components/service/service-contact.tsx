import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { NextLink } from '@/components';
import ProfileBadges from '@/components/shared/profile-badges';
import RatingDisplay from '@/components/shared/rating-display';
import UserAvatar from '@/components/shared/user-avatar';
import SocialLinks from '@/components/shared/social-links';
import { Globe } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import type { ServiceProfileFields } from '@/actions/services/get-service';

interface ServiceContactProps {
  profile: ServiceProfileFields;
  subcategory?: string;
}

export default function ServiceContact({
  profile,
  subcategory,
}: ServiceContactProps) {
  const {
    firstName,
    lastName,
    displayName,
    username,
    tagline,
    rating,
    rate,
    image,
    reviewCount,
    top,
    verified,
    socials,
    website,
    commencement,
    experience,
  } = profile;

  const getYearsOfExperience = () => {
    if (!commencement) return null;
    if (experience) return experience;
    const now = new Date();
    const start = new Date(commencement);
    const years = Math.floor(
      (now.getTime() - start.getTime()) / (365.25 * 24 * 60 * 60 * 1000),
    );
    return Math.max(0, years);
  };

  const yearsOfExperience = getYearsOfExperience();
  const displayNameValue = displayName || '';
  const usernameValue = username || '';

  return (
    <Card className='mb-0 rounded-2xl border-gray-100 shadow-sm'>
      <CardContent className='p-6'>
        {/* Profile Header */}
        <div className='flex items-start mb-4'>
          <NextLink href={`/profile/${usernameValue}`} className='mr-5'>
            <UserAvatar
              displayName={displayNameValue}
              firstName={firstName}
              lastName={lastName}
              image={image}
              top={false}
              size='xl'
              width={72}
              height={72}
              className='h-[72px] w-[72px]'
            />
          </NextLink>

          <div className='flex-1 min-w-0'>
            <div className='flex items-start gap-2 mb-1'>
              <NextLink
                href={`/profile/${usernameValue}`}
                className='text-lg font-medium text-gray-900 hover:text-third transition-colors line-clamp-2 mb-1'
              >
                {displayNameValue}
              </NextLink>
              <div className='flex-shrink-0'>
                <ProfileBadges verified={verified} topLevel={top} />
              </div>
            </div>

            {/* Subcategory - below the name, like the profile page header */}
            {subcategory && (
              <div className='mt-3 mb-3'>
                <Badge
                  variant='muted'
                  className='rounded-full border-transparent bg-primary/10 text-primary text-sm font-semibold px-3 py-1'
                >
                  {subcategory}
                </Badge>
              </div>
            )}

            <RatingDisplay
              rating={rating}
              reviewCount={reviewCount}
              showReviewCount={true}
              size='sm'
              variant='compact'
            />
          </div>
        </div>

        {/* Social Links - matches original socials section */}
        {(socials || website) && (
          <div className='flex items-center justify-end mb-4 gap-3'>
            {socials && <SocialLinks socials={socials} size='lg' />}
            {website && (
              <a
                href={website}
                target='_blank'
                rel='noopener noreferrer'
                className='text-muted-foreground transition-colors hover:text-primary'
                title='Website'
              >
                <Globe className='h-4.5 w-4.5' />
              </a>
            )}
          </div>
        )}

        <Separator className='opacity-80 my-4' />

        {/* Details section - left aligned, stacked */}
        <div className='mb-6 space-y-2 text-left'>
          {tagline && (
            <p className='text-sm text-muted-foreground line-clamp-3'>
              {tagline}
            </p>
          )}
          {rate ? (
            <span className='text-sm text-muted-foreground block'>
              {rate}€ / ώρα
            </span>
          ) : null}
          {yearsOfExperience !== null && (
            <span className='text-sm text-muted-foreground block'>
              {yearsOfExperience} έτη εμπειρίας
            </span>
          )}
        </div>

        {/* Contact Button - matches original d-grid mt30 */}
        <div className='mt-8'>
          <Button
            asChild
            size='lg'
            className='w-full'
            variant='outlineSecondary'
          >
            <NextLink href={`/profile/${usernameValue}`}>Περισσότερα</NextLink>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
