import React from 'react';
import { JsonLd } from './json-ld';

interface DirectorySchemaProps {
  categories: Array<{ slug: string }>;
}

/**
 * ItemList schema for professional directory page
 * Lists all professional categories (freelancers and companies) available on the platform
 */
export function DirectorySchema({ categories }: DirectorySchemaProps) {
  const baseUrl = process.env.LIVE_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://doulitsa.gr';

  // Map categories to ListItem format
  const categoryItems = categories.map((category, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    url: `${baseUrl}/dir/${category.slug}`,
  }));

  const data = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Επαγγελματικός Κατάλογος',
    itemListElement: categoryItems,
  };

  return <JsonLd data={data} />;
}
