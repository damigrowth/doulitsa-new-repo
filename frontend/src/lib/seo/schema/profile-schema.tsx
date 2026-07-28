import React from 'react';
import { JsonLd } from './json-ld';

interface ProfileSchemaProps {
  username: string;
  displayName: string;
  location?: string;
  rating?: number;
  reviewCount?: number;
  image?: string | null;
}

/**
 * LocalBusiness schema for profile detail pages
 * Includes location, reviews, and business information
 */
export function ProfileSchema({
  username,
  displayName,
  location,
  rating,
  reviewCount,
  image,
}: ProfileSchemaProps) {
  const baseUrl = process.env.LIVE_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://doulitsa.gr';

  const data: any = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: displayName,
    address: {
      '@type': 'PostalAddress',
      addressLocality: location || 'Greece',
      addressCountry: 'GR',
    },
    url: `${baseUrl}/profile/${encodeURIComponent(username)}`,
    image: image || undefined,
    sameAs: baseUrl,
  };

  // Add aggregate rating if reviews exist
  if (rating && reviewCount && reviewCount > 0) {
    data.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: rating,
      reviewCount: reviewCount,
      bestRating: 5,
      worstRating: 1,
    };
  }

  return <JsonLd data={data} />;
}
