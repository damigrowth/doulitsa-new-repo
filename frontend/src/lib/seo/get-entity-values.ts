import type { EntityData } from './fetch-entity';

/**
 * Extracts values from entity data for use in SEO template strings
 *
 * @param entity - The entity data object (can be service, profile, or taxonomy)
 * @param property - The property to extract (e.g., 'title', 'displayName', 'description')
 * @returns The extracted value as a string, or empty string if not found
 */
export function getEntityValues(
  entity: EntityData | null,
  property: string,
): string {
  if (!entity) return '';

  // Direct property mappings from Prisma schema
  const title = entity.title;
  const displayName = entity.displayName;
  const description = entity.description;
  const tagline = entity.tagline;
  const bio = entity.bio;

  // Taxonomy properties
  const label = entity.label;
  const plural = entity.plural;
  const type = entity.type; // Pro subcategory type: 'freelancer' | 'company'

  // Taxonomy metadata (stored as IDs in database)
  const category = entity.category;
  const subcategory = entity.subcategory;
  const subcategorySingular = entity.subcategorySingular;
  const subdivision = entity.subdivision;

  // Image handling
  const image = entity.image;
  const profileImage = entity.profileImage;

  // Media handling for services (JSON field from Prisma)
  const mediaImage =
    entity.media &&
    typeof entity.media === 'object' &&
    'images' in entity.media &&
    Array.isArray(entity.media.images) &&
    entity.media.images.length > 0
      ? entity.media.images[0]?.secure_url
      : null;

  switch (property) {
    case 'title':
      return title || '';
    case 'displayName':
      return displayName || '';
    case 'category':
      return category || '';
    case 'subcategory':
      return subcategory || '';
    case 'subcategorySingular':
      return subcategorySingular || '';
    case 'subdivision':
      return subdivision || '';
    case 'description':
      return description || '';
    case 'bio':
      return bio || '';
    case 'tagline':
      return tagline || '';

    // Archive/Taxonomy properties
    case 'arcCategory':
    case 'label':
      return label || '';
    case 'arcCategoryPlural':
    case 'plural':
      return plural || '';
    case 'arcSubcategoryPlural':
      return plural || '';
    case 'arcCategoryDesc':
    case 'arcSubcategoryDesc':
      return description || '';
    case 'type':
      return type || '';

    // Image handling
    case 'image':
      // For services: try service media first, then profile image, then entity image
      return mediaImage || profileImage || image || '';

    case 'profileImage':
      return profileImage || '';

    default:
      return '';
  }
}
