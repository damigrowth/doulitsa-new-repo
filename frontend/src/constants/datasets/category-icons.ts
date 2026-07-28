/**
 * Category Icon Mappings
 * Maps category icon identifiers to Flaticon icon components
 * Used across the application for consistent category icon display
 *
 * Icon to Category Mapping (from serviceTaxonomies):
 * - flaticon-content: Δημιουργία Περιεχομένου (Content Creation)
 * - flaticon-place: Εκδηλώσεις (Events)
 * - flaticon-like: Ζωή & Στυλ (Life & Style)
 * - flaticon-star: Ψυχαγωγία (Entertainment)
 * - flaticon-digital-marketing: Ψηφιακό Μάρκετινγκ (Digital Marketing)
 * - flaticon-developer: Προγραμματισμός & Τεχνολογία (Programming & Technology)
 * - flaticon-ruler: Σχεδιασμός (Design)
 * - flaticon-customer-service: Υποστήριξη & Διοίκηση (Support & Administration)
 */

import {
  FlaticonContent,
  FlaticonPlace,
  FlaticonLike,
  FlaticonStar,
  FlaticonDigitalMarketing,
  FlaticonDeveloper,
  FlaticonRuler,
  FlaticonCustomerService,
} from '@/components/icon/flaticon';
import React from 'react';

export type CategoryIconKey =
  | 'flaticon-content'
  | 'flaticon-place'
  | 'flaticon-like'
  | 'flaticon-star'
  | 'flaticon-digital-marketing'
  | 'flaticon-developer'
  | 'flaticon-ruler'
  | 'flaticon-customer-service';

type IconComponent = React.ComponentType<React.SVGProps<SVGSVGElement> & { size?: number; color?: string }>;

/**
 * Map category icon identifiers to Flaticon icon components
 */
export const categoryIconMap: Record<CategoryIconKey, IconComponent> = {
  'flaticon-content': FlaticonContent, // Δημιουργία Περιεχομένου
  'flaticon-place': FlaticonPlace, // Εκδηλώσεις
  'flaticon-like': FlaticonLike, // Ζωή & Στυλ
  'flaticon-star': FlaticonStar, // Ψυχαγωγία
  'flaticon-digital-marketing': FlaticonDigitalMarketing, // Ψηφιακό Μάρκετινγκ
  'flaticon-developer': FlaticonDeveloper, // Προγραμματισμός & Τεχνολογία
  'flaticon-ruler': FlaticonRuler, // Σχεδιασμός
  'flaticon-customer-service': FlaticonCustomerService, // Υποστήριξη & Διοίκηση
};

/**
 * Get icon component by category icon key
 * @param iconKey - The icon identifier from category data
 * @returns Flaticon icon component or undefined if not found
 */
export function getCategoryIcon(iconKey?: string): IconComponent | undefined {
  if (!iconKey) return undefined;
  return categoryIconMap[iconKey as CategoryIconKey];
}

/**
 * Map category icon identifiers to emoji characters
 */
export const categoryEmojiMap: Record<CategoryIconKey, string> = {
  'flaticon-content': '🎥', // Δημιουργία Περιεχομένου
  'flaticon-place': '🎶', // Εκδηλώσεις
  'flaticon-like': '💖', // Ευεξία & Φροντίδα
  'flaticon-star': '🎓', // Μαθήματα
  'flaticon-digital-marketing': '🎯', // Μάρκετινγκ
  'flaticon-developer': '💻', // Πληροφορική
  'flaticon-ruler': '🪛', // Τεχνικά
  'flaticon-customer-service': '🤝', // Υποστήριξη
};

/**
 * Get emoji by category icon key
 * @param iconKey - The icon identifier from category data
 * @returns Emoji string or undefined if not found
 */
export function getCategoryEmoji(iconKey?: string): string | undefined {
  if (!iconKey) return undefined;
  return categoryEmojiMap[iconKey as CategoryIconKey];
}

/**
 * Map category icon identifiers to their line-art icon image (in /public/category-icons)
 * Keyed by category slug for clarity.
 */
export const categoryIconImageMap: Record<CategoryIconKey, string> = {
  'flaticon-content': '/category-icons/dimiourgia-periexomenou.png', // Δημιουργία Περιεχομένου
  'flaticon-place': '/category-icons/ekdiloseis.png', // Εκδηλώσεις
  'flaticon-like': '/category-icons/eveksia-frontida.png', // Ευεξία & Φροντίδα
  'flaticon-star': '/category-icons/mathimata.png', // Μαθήματα
  'flaticon-digital-marketing': '/category-icons/marketing.png', // Μάρκετινγκ
  'flaticon-developer': '/category-icons/pliroforiki.png', // Πληροφορική
  'flaticon-ruler': '/category-icons/texnika.png', // Τεχνικά
  'flaticon-customer-service': '/category-icons/ypostiriksi.png', // Υποστήριξη
};

/**
 * Get the icon image path by category icon key
 * @param iconKey - The icon identifier from category data
 * @returns Public image path or undefined if not found
 */
export function getCategoryIconImage(iconKey?: string): string | undefined {
  if (!iconKey) return undefined;
  return categoryIconImageMap[iconKey as CategoryIconKey];
}

/**
 * Top-level category slugs that have a matching icon image in /public/category-icons
 */
export const categoryIconImageSlugs = [
  'dimiourgia-periexomenou',
  'ekdiloseis',
  'eveksia-frontida',
  'mathimata',
  'marketing',
  'pliroforiki',
  'texnika',
  'ypostiriksi',
] as const;

export type CategoryIconSlug = (typeof categoryIconImageSlugs)[number];

/**
 * Get the icon image path by category slug
 * @param slug - The top-level category slug
 * @returns Public image path or undefined if not found
 */
export function getCategoryIconImageBySlug(slug?: string): string | undefined {
  if (!slug) return undefined;
  return categoryIconImageSlugs.includes(slug as CategoryIconSlug)
    ? `/category-icons/${slug}.png`
    : undefined;
}

/**
 * Map category icon identifiers to their colorful 3D icon image
 * (in /public/category-icons, suffixed with "-3d"). Used on the homepage.
 */
export const categoryIcon3dImageMap: Record<CategoryIconKey, string> = {
  'flaticon-content': '/category-icons/dimiourgia-periexomenou-3d.png', // Δημιουργία Περιεχομένου
  'flaticon-place': '/category-icons/ekdiloseis-3d.png', // Εκδηλώσεις
  'flaticon-like': '/category-icons/eveksia-frontida-3d.png', // Ευεξία & Φροντίδα
  'flaticon-star': '/category-icons/mathimata-3d.png', // Μαθήματα
  'flaticon-digital-marketing': '/category-icons/marketing-3d.png', // Μάρκετινγκ
  'flaticon-developer': '/category-icons/pliroforiki-3d.png', // Πληροφορική
  'flaticon-ruler': '/category-icons/texnika-3d.png', // Τεχνικά
  'flaticon-customer-service': '/category-icons/ypostiriksi-3d.png', // Υποστήριξη
};

/**
 * Get the 3D icon image path by category icon key
 */
export function getCategoryIcon3dImage(iconKey?: string): string | undefined {
  if (!iconKey) return undefined;
  return categoryIcon3dImageMap[iconKey as CategoryIconKey];
}

/**
 * Get the 3D icon image path by category slug
 */
export function getCategoryIcon3dImageBySlug(slug?: string): string | undefined {
  if (!slug) return undefined;
  return categoryIconImageSlugs.includes(slug as CategoryIconSlug)
    ? `/category-icons/${slug}-3d.png`
    : undefined;
}
