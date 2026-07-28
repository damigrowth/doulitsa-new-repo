'use server';

import { Metadata } from 'next';
import { truncateText } from '../utils/format';

interface MetaDataParams {
  title: string;
  description?: string;
  size?: number;
  image?: string;
  url: string;
}

interface MetaDataResponse {
  meta: Metadata;
}

export async function MetaData({
  title,
  description,
  size = 150,
  image,
  url,
}: MetaDataParams): Promise<MetaDataResponse> {
  const truncatedDescription = description
    ? truncateText(description, size)
    : '';

  const fallbackDescription =
    'Ανακάλυψε εξειδικευμένους επαγγελματίες και υπηρεσίες από όλη την Ελλάδα. Από ψηφιακές υπηρεσίες έως τεχνικές εργασίες, έχουμε ό,τι χρειάζεσαι.';

  const baseUrl = process.env.LIVE_URL || 'https://doulitsa.gr';

  const fallbackImage = `${baseUrl}/doulitsa-og.png`;

  const meta: Metadata = {
    metadataBase: new URL(baseUrl),
    title,
    description: truncatedDescription || fallbackDescription,
    openGraph: {
      title,
      description: truncatedDescription || fallbackDescription,
      url: `${baseUrl}${url}`,
      siteName: 'Doulitsa',
      images: [
        {
          url: !image || image === '' ? fallbackImage : image,
          width: 1600,
          height: 900,
          alt: title,
        },
      ],
      locale: 'el_GR',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: truncatedDescription || fallbackDescription,
      creator: '@doulitsa',
      images: [
        {
          url: !image || image === '' ? fallbackImage : image,
          width: 1600,
          height: 900,
          alt: title,
        },
      ],
    },
    alternates: {
      canonical: `${baseUrl}${url}`,
      languages: {
        'el-GR': `${baseUrl}${url}`,
      },
    },
  };

  return { meta };
}
