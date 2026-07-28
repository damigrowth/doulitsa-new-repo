'use server';

import { notFound } from 'next/navigation';
import { Metadata } from 'next';

import { fetchEntity } from './fetch-entity';
import { formatTemplate } from './format-template';
import { MetaData } from './metadata';

/**
 * Entity type for SEO metadata generation
 */
type EntityType =
  | 'service'
  | 'profile'
  | 'serviceCategory'
  | 'serviceSubcategory'
  | 'serviceSubdivision'
  | 'proCategory'
  | 'proSubcategory';

interface MetaParams {
  type?: EntityType;
  params?: any;
  titleTemplate: string;
  descriptionTemplate: string;
  size?: number;
  url?: string;
  customUrl?: string;
}

interface MetaResponse {
  meta: Metadata;
}

export async function Meta({
  type,
  params,
  titleTemplate,
  descriptionTemplate,
  size = 150,
  url,
  customUrl,
}: MetaParams): Promise<MetaResponse> {
  try {
    if (type) {
      const { entity } = await fetchEntity(type, params);

      if (!entity) {
        notFound();
      }

      const title = formatTemplate(titleTemplate, entity);
      const description = formatTemplate(descriptionTemplate, entity);
      const image = formatTemplate('%image%', entity);

      // For services, construct URL from slug if not explicitly provided
      let finalUrl = url;
      if (!finalUrl && type === 'service' && entity.slug) {
        finalUrl = `/s/${entity.slug}`;
      } else if (!finalUrl && customUrl && entity.slug) {
        finalUrl = `${customUrl}/${entity.slug}`;
      }

      const { meta } = await MetaData({
        title,
        description,
        size,
        image,
        url: finalUrl,
      });

      return { meta };
    } else {
      const { meta } = await MetaData({
        title: titleTemplate,
        description: descriptionTemplate,
        size,
        url: url || customUrl || '',
      });

      return { meta };
    }
  } catch (error: any) {
    // Don't log expected Next.js errors when notFound() is called
    const isExpectedNotFoundError =
      error?.digest?.includes('NEXT_REDIRECT') ||
      error?.digest?.includes('NEXT_HTTP_ERROR_FALLBACK');

    if (!isExpectedNotFoundError) {
      console.error('Error fetching entity data:', error);
    }
    notFound();
  }
}
