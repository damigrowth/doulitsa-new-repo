import React from 'react';
import { JsonLd } from './json-ld';

interface ServicesSchemaProps {
  services: Array<{ slug: string | null }>;
  taxonomies?: {
    category?: { label?: string } | null;
    subcategory?: { label?: string } | null;
    subdivision?: { label?: string } | null;
  };
}

/**
 * ItemList schema for services archive pages
 * Lists services with taxonomy context
 */
export function ServicesSchema({ services, taxonomies }: ServicesSchemaProps) {
  const baseUrl = process.env.LIVE_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://doulitsa.gr';

  // Map services to ListItem format, filtering out those without slugs
  const serviceItems = services
    .filter((service) => service.slug)
    .map((service, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      url: `${baseUrl}/s/${service.slug}`,
    }));

  // Build taxonomy labels string
  let taxonomyLabels = '';

  if (taxonomies) {
    taxonomyLabels = `${
      taxonomies.category?.label ? ' - ' + taxonomies.category.label : ''
    }${taxonomies.subcategory?.label ? ' - ' + taxonomies.subcategory.label : ''}${
      taxonomies.subdivision?.label ? ' - ' + taxonomies.subdivision.label : ''
    }`;
  }

  const data = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Υπηρεσίες${taxonomyLabels}`,
    itemListElement: serviceItems,
  };

  return <JsonLd data={data} />;
}
