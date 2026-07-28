import React from 'react';

interface JsonLdProps {
  data: Record<string, any>;
}

/**
 * JSON-LD structured data wrapper component
 * Renders schema.org markup for SEO and rich results
 */
export function JsonLd({ data }: JsonLdProps) {
  const jsonData = JSON.stringify(data);

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: jsonData }}
    />
  );
}
