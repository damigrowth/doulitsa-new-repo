'use server';

/**
 * fetchEntity — Django-backed.
 *
 * Used only by SEO metadata generation. Now calls the Django REST endpoints
 * for Service / Profile detail and the in-process taxonomy datasets for
 * category/subcategory/subdivision metadata.
 */

import * as profilesApi from '@/lib/api/profiles';
import * as servicesApi from '@/lib/api/services';
import { ApiError } from '@/lib/api/client';
import {
  findProById,
  findProBySlug,
  findServiceBySlug,
  getServiceTaxonomies,
  resolveServiceHierarchy,
} from '@/lib/taxonomies';
import type { DatasetItem } from '@/lib/types/datasets';
import { findBySlug } from '@/lib/utils/datasets';

export type EntityData = {
  title?: string | null;
  description?: string | null;
  slug?: string | null;
  media?: unknown;
  displayName?: string | null;
  tagline?: string | null;
  image?: string | null;
  username?: string | null;
  bio?: string | null;
  label?: string | null;
  plural?: string | null;
  category?: string;
  subcategory?: string;
  subcategorySingular?: string;
  subdivision?: string;
  type?: string;
  profileImage?: string | null;
};

type EntityType =
  | 'service'
  | 'profile'
  | 'serviceCategory'
  | 'serviceSubcategory'
  | 'serviceSubdivision'
  | 'proCategory'
  | 'proSubcategory';

interface FetchEntityParams {
  id?: number;
  slug?: string;
  username?: string;
  categorySlug?: string;
  subcategorySlug?: string;
  subdivisionSlug?: string;
}

export async function fetchEntity(
  type: EntityType,
  params: FetchEntityParams,
): Promise<{ entity: EntityData | null }> {
  try {
    switch (type) {
      case 'service': {
        if (!params.id) throw new Error('Service ID is required');
        const bundle = (await servicesApi.getServicePage(params.id)) as {
          service: {
            title: string;
            description: string;
            slug: string;
            media: unknown;
            category: string | null;
            subcategory: string | null;
            subdivision: string | null;
            profile: { displayName: string | null; username: string | null; image: string | null } | null;
          };
        };
        const s = bundle.service;
        const { category, subcategory, subdivision } = resolveServiceHierarchy(
          s.category, s.subcategory, s.subdivision,
        );
        return {
          entity: {
            title: s.title,
            description: s.description,
            slug: s.slug,
            media: s.media,
            displayName: s.profile?.displayName,
            profileImage: s.profile?.image,
            category: category?.label,
            subcategory: subcategory?.label,
            subdivision: subdivision?.label,
          },
        };
      }

      case 'profile': {
        if (!params.username) throw new Error('Profile username is required');
        const profile = (await profilesApi.getProfileByUsername(params.username)) as {
          displayName: string | null;
          tagline: string | null;
          bio: string | null;
          image: string | null;
          username: string | null;
          type: string | null;
          category: string | null;
          subcategory: string | null;
        };
        const category = profile.category ? findProById(profile.category) : undefined;
        const subcategory = profile.subcategory ? findProById(profile.subcategory) : undefined;
        const typeLabel =
          profile.type === 'freelancer' ? 'Επαγγελματίας' :
          profile.type === 'company' ? 'Επιχείρηση' : undefined;
        return {
          entity: {
            displayName: profile.displayName,
            tagline: profile.tagline,
            bio: profile.bio,
            image: profile.image,
            username: profile.username,
            category: category?.label,
            subcategory: subcategory?.label,
            subcategorySingular: subcategory?.label,
            type: typeLabel,
          },
        };
      }

      case 'serviceCategory': {
        if (!params.categorySlug) throw new Error('Category slug is required');
        const category = findServiceBySlug(params.categorySlug);
        if (!category) return { entity: null };
        return {
          entity: {
            label: category.label,
            plural: category.label,
            description: category.description,
            image: undefined,
          },
        };
      }

      case 'serviceSubcategory': {
        if (!params.subcategorySlug) throw new Error('Subcategory slug is required');
        if (params.categorySlug) {
          const category = findServiceBySlug(params.categorySlug);
          const subcategory = category?.children
            ? findBySlug(category.children, params.subcategorySlug)
            : undefined;
          if (!subcategory) return { entity: null };
          return {
            entity: {
              label: subcategory.label,
              plural: subcategory.label,
              description: subcategory.description,
              image: undefined,
            },
          };
        }
        for (const category of getServiceTaxonomies()) {
          if (!category.children) continue;
          const subcategory = findBySlug(category.children, params.subcategorySlug);
          if (subcategory) {
            return {
              entity: {
                label: subcategory.label,
                plural: subcategory.label,
                description: subcategory.description,
                image: undefined,
              },
            };
          }
        }
        return { entity: null };
      }

      case 'serviceSubdivision': {
        if (!params.subcategorySlug || !params.subdivisionSlug) {
          throw new Error('Subcategory and subdivision slugs are required');
        }
        if (params.categorySlug) {
          const category = findServiceBySlug(params.categorySlug);
          const subcategory = category?.children
            ? findBySlug(category.children, params.subcategorySlug)
            : undefined;
          const subdivision = subcategory?.children
            ? findBySlug(subcategory.children, params.subdivisionSlug)
            : undefined;
          if (!subdivision) return { entity: null };
          return {
            entity: {
              label: subdivision.label,
              plural: subdivision.label,
              description: subdivision.description,
              image: subdivision.image?.secure_url,
            },
          };
        }
        for (const category of getServiceTaxonomies()) {
          if (!category.children) continue;
          const subcategory = findBySlug(category.children, params.subcategorySlug);
          if (!subcategory?.children) continue;
          const subdivision = findBySlug(subcategory.children, params.subdivisionSlug);
          if (subdivision) {
            return {
              entity: {
                label: subdivision.label,
                plural: subdivision.label,
                description: subdivision.description,
                image: subdivision.image?.secure_url,
              },
            };
          }
        }
        return { entity: null };
      }

      case 'proCategory': {
        if (!params.categorySlug) throw new Error('Category slug is required');
        const category = findProBySlug(params.categorySlug);
        if (!category) return { entity: null };
        return {
          entity: {
            label: category.label,
            plural: category.plural,
            description: category.description,
            image: undefined,
          },
        };
      }

      case 'proSubcategory': {
        if (!params.categorySlug || !params.subcategorySlug) {
          throw new Error('Category and subcategory slugs are required');
        }
        const category = findProBySlug(params.categorySlug);
        const subcategory = category?.children
          ? findBySlug(category.children, params.subcategorySlug)
          : undefined;
        if (!subcategory) return { entity: null };
        return {
          entity: {
            label: subcategory.label,
            plural: subcategory.plural,
            type: subcategory.type,
            description: subcategory.description,
            image: undefined,
          },
        };
      }

      default:
        throw new Error(`Unsupported entity type: ${type}`);
    }
  } catch (err) {
    if (!(err instanceof ApiError)) {
      console.error('fetchEntity error:', err);
    }
    return { entity: null };
  }
}
