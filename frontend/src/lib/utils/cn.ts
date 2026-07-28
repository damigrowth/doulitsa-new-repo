/**
 * CLASS NAME UTILITY
 * Combines tailwind classes with conditional logic
 */

import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Combines classes with tailwind-merge to handle conflicts
 * @param inputs - Class names and conditional class objects
 * @returns Merged class string
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Create variant-based class combinations
 * @param base - Base classes always applied
 * @param variants - Variant configurations
 * @param defaultVariant - Default variant values
 */
export function createVariants<V extends Record<string, Record<string, string>>>(
  base: string,
  variants: V,
  defaultVariant?: Partial<{ [K in keyof V]: keyof V[K] }>
) {
  return (props: Partial<{ [K in keyof V]: keyof V[K] }> & { className?: string }) => {
    const variantClasses = Object.keys(variants).map((key) => {
      const variantKey = key as keyof V;
      const value = props[variantKey] || defaultVariant?.[variantKey];
      return value ? variants[variantKey][value as keyof V[keyof V]] : '';
    });

    return cn(base, ...variantClasses, props.className);
  };
}