import React from 'react';
import { JsonLd } from './json-ld';

interface ServiceSchemaProps {
  slug: string;
  title: string;
  description?: string;
  displayName: string;
  price: number;
  rating?: number;
  reviewCount?: number;
  faq: Array<{ question: string; answer: string }>;
  image?: string;
}

/**
 * Product schema for service detail pages
 * Includes pricing, reviews, and FAQ structured data
 */
export function ServiceSchema({
  slug,
  title,
  description,
  displayName,
  price,
  rating,
  reviewCount,
  faq,
  image,
}: ServiceSchemaProps) {
  const baseUrl = process.env.LIVE_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://doulitsa.gr';

  // Build base product schema
  const data: any = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: title,
    image: image,
    brand: {
      '@type': 'Brand',
      name: 'Doulitsa',
    },
    manufacturer: {
      '@type': 'Person',
      name: displayName,
    },
    offers: {
      '@type': 'Offer',
      priceCurrency: 'EUR',
      price: price,
      url: `${baseUrl}/s/${slug}`,
      availability: 'https://schema.org/InStock',
    },
  };

  // Add description if provided
  if (description) {
    data.description = description;
  }

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

  // Only include FAQ schema if FAQs exist
  if (faq && faq.length > 0) {
    const faqData = faq.map((f, index) => ({
      '@type': 'Question',
      name: `Ερώτηση ${index + 1}`,
      text: f.question,
      acceptedAnswer: {
        '@type': 'Answer',
        name: `Απάντηση ${index + 1}`,
        text: f.answer,
      },
    }));

    data.mainEntity = {
      '@type': 'FAQPage',
      mainEntity: faqData,
    };
  }

  return <JsonLd data={data} />;
}
