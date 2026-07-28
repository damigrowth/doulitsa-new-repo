'use client';

import React from 'react';
import Image from 'next/image';
import { Star } from 'lucide-react';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import { CarouselPagination } from '@/components/ui/carousel-pagination';
import { SectionHeader } from '@/components/ui/section-header';
import {
  getCategoryIcon,
  getCategoryIcon3dImage,
  getCategoryIcon3dImageBySlug,
} from '@/constants/datasets/category-icons';
import { cn } from '@/lib/utils';
import type { DatasetItem } from '@/lib/types/datasets';
import { NextLink } from '@/components';

type Props = {
  categories?: DatasetItem[];
  fallbackCategories?: any[];
};

/**
 * Soft accent glow color per category, tuned to each 3D icon's dominant hue.
 * Full class strings are written literally so Tailwind's JIT can detect them.
 */
const CATEGORY_GLOW: Record<string, string> = {
  'flaticon-content': 'bg-violet-400', // Δημιουργία Περιεχομένου
  'flaticon-place': 'bg-indigo-400', // Εκδηλώσεις
  'flaticon-like': 'bg-rose-400', // Ευεξία & Φροντίδα
  'flaticon-star': 'bg-amber-400', // Μαθήματα
  'flaticon-digital-marketing': 'bg-red-400', // Μάρκετινγκ
  'flaticon-developer': 'bg-sky-400', // Πληροφορική
  'flaticon-ruler': 'bg-emerald-400', // Τεχνικά
  'flaticon-customer-service': 'bg-teal-400', // Υποστήριξη
};

function CategoryIcon({
  icon,
  slug,
  label,
}: {
  icon?: string;
  slug: string;
  label: string;
}) {
  const iconImage =
    getCategoryIcon3dImage(icon) ?? getCategoryIcon3dImageBySlug(slug);
  const glow = (icon && CATEGORY_GLOW[icon]) || 'bg-fourth';

  return (
    <div className='relative inline-flex items-center justify-center mb-4 sm:mb-5'>
      {/* Colored glow blob behind the icon — intensifies on hover */}
      <span
        aria-hidden='true'
        className={cn(
          'pointer-events-none absolute inset-0 m-auto h-11 w-11 rounded-full blur-xl opacity-30 scale-90 transition-all duration-500 ease-out group-hover:opacity-70 group-hover:scale-[1.6]',
          glow
        )}
      />

      {iconImage ? (
        <Image
          src={iconImage}
          alt={label}
          width={64}
          height={64}
          loading='lazy'
          sizes='64px'
          className='relative z-10 h-14 w-14 sm:h-16 sm:w-16 object-contain transition-transform duration-300 ease-out will-change-transform group-hover:-translate-y-1 group-hover:scale-110'
        />
      ) : (
        <span className='relative z-10 text-4xl text-primary'>
          {(() => {
            const IconComponent = icon ? getCategoryIcon(icon) : undefined;
            return IconComponent ? (
              <IconComponent size={40} />
            ) : (
              <Star size={40} />
            );
          })()}
        </span>
      )}
    </div>
  );
}

function CategoryCard({ category }: { category: DatasetItem }) {
  const { label, slug, subcategories, icon } = category;

  return (
    <div className='bg-transparent rounded-xl p-6 relative transition-all duration-300 ease-in-out group'>
      <div className='text-left'>
        <NextLink
          href={`/categories/${slug}`}
          className='inline-block'
          aria-label={label}
        >
          <CategoryIcon icon={icon} slug={slug} label={label} />
        </NextLink>
      </div>

      <div className='mt-2'>
        <h2 className='text-sm mb-1.5 font-bold leading-6 text-left'>
          <NextLink
            href={`/categories/${slug}`}
            className='text-gray-900 hover:text-third transition-colors'
          >
            {label}
          </NextLink>
        </h2>

        <p className='mb-0 text-sm text-gray-600 text-left line-clamp-2'>
          {(subcategories || []).map((sub, i, array) => (
            <span key={sub.id ?? sub.slug ?? i}>
              <NextLink
                href={sub.href ?? `/ipiresies/${sub.slug}`}
                className='hover:text-third transition-colors'
              >
                {sub.label ?? sub.slug}
              </NextLink>
              {i < array.length - 1 ? ', ' : ''}
            </span>
          ))}
        </p>
      </div>
    </div>
  );
}

export default function CategoriesHome({
  categories = [],
  fallbackCategories = [],
}: Props) {
  // Use provided categories with subcategories or server-prepared fallback
  const displayCategories =
    categories.length > 0 ? categories : fallbackCategories;

  return (
    <section className='pt-2 sm:pt-3 md:pt-4 pb-8 sm:pb-12 md:pb-16 lg:pb-24'>
      <div className='container mx-auto px-4 sm:px-6'>
        <SectionHeader
          title='Κατηγορίες'
          description='Ανακάλυψε 100+ κατηγορίες υπηρεσιών.'
          linkHref='/categories'
          linkText='Όλες οι Κατηγορίες'
        />

        <div className='hidden lg:flex flex-wrap'>
          {displayCategories.slice(0, 8).map((category, index) => {
            const getBootstrapClasses = (index: number) => {
              const baseClasses = 'w-1/2 sm:w-1/2 lg:w-1/3 xl:w-1/4';
              let borderClasses = 'border border-border -mb-px';

              switch (index) {
                case 0:
                  return `${baseClasses} ${borderClasses} border-l-0 border-t-0`;
                case 1:
                  return `${baseClasses} ${borderClasses} border-t-0`;
                case 2:
                  return `${baseClasses} ${borderClasses} border-t-0`;
                case 3:
                  return `${baseClasses} ${borderClasses} border-t-0 border-r-0`;
                case 4:
                  return `${baseClasses} ${borderClasses} border-l-0 border-b-0`;
                case 5:
                  return `${baseClasses} ${borderClasses} border-b-0`;
                case 6:
                  return `${baseClasses} ${borderClasses} border-b-0`;
                case 7:
                  return `${baseClasses} ${borderClasses} border-b-0 border-r-0`;
                default:
                  return `${baseClasses} ${borderClasses}`;
              }
            };

            return (
              <div key={index} className={getBootstrapClasses(index)}>
                <CategoryCard category={category} />
              </div>
            );
          })}
        </div>

        <div className='block lg:hidden'>
          <Carousel
            opts={{
              align: 'start',
              slidesToScroll: 1,
            }}
            className='w-full'
          >
            <CarouselContent className='-ml-0 sm:-ml-2'>
              {displayCategories.map((category, index) => (
                <CarouselItem
                  key={index}
                  className='pl-2 sm:pl-4 basis-full sm:basis-1/2 mb-1'
                >
                  <div className='border border-border shadow-sm rounded-xl'>
                    <CategoryCard category={category} />
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>

            {/* Navigation Controls - hide on mobile, show on larger screens */}
            {displayCategories.length > 1 && (
              <>
                <CarouselPrevious className='hidden sm:flex' />
                <CarouselNext className='hidden sm:flex' />
              </>
            )}

            {/* Pagination Dots */}
            {displayCategories.length > 1 && (
              <CarouselPagination
                slideCount={displayCategories.length}
                className='mt-4 sm:mt-6 justify-center'
              />
            )}
          </Carousel>
        </div>
      </div>
    </section>
  );
}
