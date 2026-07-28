import React from 'react';
import { JsonLd } from './json-ld';

interface ProfilesSchemaProps {
  type: 'company' | 'freelancer';
  profiles: Array<{ username: string | null }>;
  taxonomies?: {
    category?: { plural?: string; label?: string } | null;
    subcategory?: { plural?: string; label?: string } | null;
  };
}

/**
 * ItemList schema for profiles archive pages
 * Lists professionals or companies with taxonomy context
 */
export function ProfilesSchema({
  type,
  profiles,
  taxonomies,
}: ProfilesSchemaProps) {
  const baseUrl = process.env.LIVE_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://doulitsa.gr';

  // Map profiles to ListItem format, filtering out those without usernames
  const profileItems = profiles
    .filter((profile) => profile.username)
    .map((profile, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      url: `${baseUrl}/profile/${profile.username}`,
    }));

  // Build taxonomy labels string
  const taxonomyLabels = taxonomies
    ? `${
        taxonomies.category
          ? ' - ' + (taxonomies.category.plural || taxonomies.category.label || '')
          : ''
      }${
        taxonomies.subcategory
          ? ' - ' + (taxonomies.subcategory.plural || taxonomies.subcategory.label || '')
          : ''
      }`
    : '';

  const data = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `${
      type === 'company' ? 'Επιχειρήσεις' : 'Επαγγελματίες'
    }${taxonomyLabels}`,
    itemListElement: profileItems,
  };

  return <JsonLd data={data} />;
}
