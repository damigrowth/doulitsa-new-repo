import { cn } from '@/lib/utils';
import {
  getCategoryIconImage,
  getCategoryIconImageBySlug,
} from '@/constants/datasets/category-icons';

interface CategoryIconProps {
  /** Category icon identifier (e.g. "flaticon-place") */
  iconKey?: string;
  /** Top-level category slug (e.g. "ekdiloseis"). Used if iconKey is absent. */
  slug?: string;
  /** Pixel size of the square icon */
  size?: number;
  className?: string;
}

/**
 * Renders a category line-art icon, recolored via a CSS mask so it inherits
 * the element's background color. Defaults to the brand primary color.
 */
export function CategoryIcon({
  iconKey,
  slug,
  size = 20,
  className,
}: CategoryIconProps) {
  const src = getCategoryIconImage(iconKey) ?? getCategoryIconImageBySlug(slug);
  if (!src) return null;

  return (
    <span
      aria-hidden='true'
      className={cn('inline-block shrink-0 bg-primary', className)}
      style={{
        width: size,
        height: size,
        maskImage: `url(${src})`,
        WebkitMaskImage: `url(${src})`,
        maskRepeat: 'no-repeat',
        WebkitMaskRepeat: 'no-repeat',
        maskPosition: 'center',
        WebkitMaskPosition: 'center',
        maskSize: 'contain',
        WebkitMaskSize: 'contain',
      }}
    />
  );
}

export default CategoryIcon;
