import React from 'react';
import { JsonLd } from './json-ld';

interface ArticleAuthor {
  displayName: string | null;
  username: string | null;
}

interface ArticleSchemaProps {
  slug: string;
  title: string;
  excerpt?: string | null;
  coverImage?: any;
  publishedAt?: Date | string | null;
  updatedAt?: Date | string | null;
  authors: ArticleAuthor[];
}

/**
 * Article schema for blog article detail pages
 * Generates schema.org Article structured data for SEO
 */
export function ArticleSchema({
  slug,
  title,
  excerpt,
  coverImage,
  publishedAt,
  updatedAt,
  authors,
}: ArticleSchemaProps) {
  const baseUrl =
    process.env.LIVE_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://doulitsa.gr';

  const data: any = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    url: `${baseUrl}/articles/${slug}`,
    publisher: {
      '@type': 'Organization',
      name: 'Doulitsa',
      url: baseUrl,
    },
  };

  if (excerpt) {
    data.description = excerpt;
  }

  if (coverImage) {
    data.image =
      typeof coverImage === 'object' && coverImage.secure_url
        ? coverImage.secure_url
        : typeof coverImage === 'string'
          ? coverImage
          : undefined;
  }

  if (publishedAt) {
    data.datePublished = new Date(publishedAt).toISOString();
  }

  if (updatedAt) {
    data.dateModified = new Date(updatedAt).toISOString();
  }

  if (authors.length > 0) {
    data.author = authors.map((author) => ({
      '@type': 'Person',
      name: author.displayName || 'Doulitsa Team',
      ...(author.username && {
        url: `${baseUrl}/profile/${author.username}`,
      }),
    }));

    // If single author, unwrap from array
    if (data.author.length === 1) {
      data.author = data.author[0];
    }
  }

  return <JsonLd data={data} />;
}
