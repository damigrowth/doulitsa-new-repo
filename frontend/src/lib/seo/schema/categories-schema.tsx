import React from 'react';
import { JsonLd } from './json-ld';

interface CategoriesSchemaProps {
  categories: Array<{ slug: string }>;
}

/**
 * ItemList schema for categories page
 * Lists all service categories available on the platform
 */
export function CategoriesSchema({ categories }: CategoriesSchemaProps) {
  const baseUrl = process.env.LIVE_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://doulitsa.gr';

  // Map categories to ListItem format
  const categoryItems = categories.map((category, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    url: `${baseUrl}/categories/${category.slug}`,
  }));

  const data = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Κατηγορίες Υπηρεσιών',
    itemListElement: categoryItems,
  };

  return <JsonLd data={data} />;
}
