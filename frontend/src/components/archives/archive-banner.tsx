'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getOptimizedImageUrl } from '@/lib/utils/cloudinary';

interface ArchiveBannerProps {
  title: string;
  subtitle: string;
  className?: string;
  image?: {
    secure_url: string;
    original_filename?: string;
  };
  /** When false, no category image (or fallback) is rendered. */
  showImage?: boolean;
  /** Parent category label, shown as an eyebrow badge above the title. */
  parentLabel?: string;
  /** When set, the parent badge links to this URL. */
  parentHref?: string;
}

export function ArchiveBanner({
  title,
  subtitle,
  className,
  image,
  showImage = true,
  parentLabel,
  parentHref,
}: ArchiveBannerProps) {
  const parentBadgeClass =
    'inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 py-1.5 pl-3.5 pr-4 text-xs font-medium text-white/85 backdrop-blur-sm sm:text-sm';
  return (
    <section
      className={cn('py-0 md:py-4 container mx-auto px-4 sm:px-6', className)}
    >
      <div className='archives-banner relative flex items-center overflow-hidden rounded-2xl bg-primary bg-gradient-to-br from-primary to-secondary'>
        {/* Subtle emerald brand accent (replaces legacy vector images) */}
        <div
          aria-hidden='true'
          className='pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-secondary/20 blur-3xl'
        />
        <div
          aria-hidden='true'
          className='pointer-events-none absolute -bottom-32 left-1/3 h-64 w-64 rounded-full bg-secondary/10 blur-3xl'
        />

        {/* Category image — clean framed card, full image shown crisp & undistorted */}
        {showImage && (
          <div className='absolute right-6 top-1/2 z-0 hidden h-[72%] aspect-video -translate-y-1/2 overflow-hidden rounded-xl opacity-70 shadow-2xl shadow-black/30 lg:block xl:right-10'>
            <Image
              alt={image?.original_filename || 'Service category'}
              fill
              sizes='320px'
              className='object-cover'
              src={
                getOptimizedImageUrl(image?.secure_url, 'cardLarge') ||
                '/vector-service-template.webp'
              }
              priority
            />
          </div>
        )}

        <div className='relative z-20'>
          <div className='flex items-center justify-between'>
            <div className='my-10 ml-4 max-w-xl sm:ml-12 md:ml-24 lg:ml-36'>
              {parentLabel &&
                (parentHref ? (
                  <Link
                    href={parentHref}
                    className={cn(
                      parentBadgeClass,
                      'mb-3 transition-colors hover:border-white/40 hover:bg-white/20 hover:text-white',
                    )}
                  >
                    <Layers
                      aria-hidden='true'
                      className='h-3.5 w-3.5 text-white/70'
                    />
                    <span className='leading-none'>{parentLabel}</span>
                  </Link>
                ) : (
                  <div className={cn(parentBadgeClass, 'mb-3')}>
                    <Layers
                      aria-hidden='true'
                      className='h-3.5 w-3.5 text-white/70'
                    />
                    <span className='leading-none'>{parentLabel}</span>
                  </div>
                ))}
              <h1 className='mb-2 text-xl font-bold text-white sm:text-2xl lg:text-3xl'>
                {title}
              </h1>
              <h2 className='mb-0 text-sm font-medium leading-relaxed text-white/75 sm:text-base'>
                {subtitle}
              </h2>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
