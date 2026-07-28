import { getBlogCategoryBySlug } from '@/constants/datasets/blog-categories';
import { getOptimizedImageUrl } from '@/lib/utils/cloudinary';
import { stripHtmlTags } from '@/lib/utils/text/html';

export function resolveCoverUrl(
  coverImage: unknown,
  preset: 'cardLarge' | 'carousel' | 'full',
): string | null {
  if (!coverImage) return null;
  return (
    getOptimizedImageUrl(coverImage as any, preset) ||
    (typeof coverImage === 'object' && coverImage !== null
      ? (coverImage as any).secure_url ?? null
      : typeof coverImage === 'string'
        ? coverImage
        : null)
  );
}

export function resolveCategoryLabel(
  categorySlug: string | null | undefined,
): string | null {
  if (!categorySlug) return null;
  return getBlogCategoryBySlug(categorySlug)?.label ?? null;
}

export function estimateReadTime(content: string | null): number {
  if (!content) return 1;
  const plainText = stripHtmlTags(content);
  const wordCount = plainText.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(wordCount / 200));
}
