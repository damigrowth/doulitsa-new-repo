import React from 'react';
import { JsonLd } from './json-ld';

/**
 * Organization schema for homepage
 * Includes site branding, search functionality, and social profiles
 */
export function HomeSchema() {
  // Canonical production URL for structured data (must be absolute & stable)
  const baseUrl = process.env.LIVE_URL || 'https://doulitsa.gr';

  // Self-hosted logo (absolute URL required for structured data)
  const logoUrl = `${baseUrl}/doulitsa-logo.svg`;

  const searchUrlTemplate = `/ipiresies?search={search_term_string}`;

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Doulitsa',
    url: baseUrl,
    logo: logoUrl,
    sameAs: ['https://www.linkedin.com/company/doulitsa'],
    potentialAction: {
      '@type': 'SearchAction',
      target: `${baseUrl}${searchUrlTemplate}`,
      'query-input': {
        '@type': 'PropertyValueSpecification',
        valueRequired: true,
        valueName: 'search_term_string',
      },
    },
  };

  return <JsonLd data={schema} />;
}
