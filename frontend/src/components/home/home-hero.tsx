'use client';

import React, { Suspense } from 'react';
import { Star, Rocket, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { HomeSearch } from './home-search';
import type { DatasetItem } from '@/lib/types/datasets';
import { NextLink } from '@/components';

// Static content that renders immediately for better LCP
function StaticHeroContent() {
  return (
    <div className='text-center max-w-3xl lg:max-w-4xl mx-auto [contain:layout_style]'>
      {/* Badges Row */}
      <div className='flex flex-wrap gap-2 mb-6 items-center justify-center'>
        {/* Service Directory Badge */}
        <NextLink href='/categories' className='inline-block'>
          <Badge className='bg-secondary text-secondary-foreground rounded-full px-3 py-1 text-3sm font-medium cursor-pointer mb-2 sm:mb-0'>
            Κατάλογος Υπηρεσιών
          </Badge>
        </NextLink>

        {/* Cycling Badges Container - All in same position */}
        <div className='relative inline-block h-[26px] min-w-[220px] [contain:layout]'>
          <Badge className='absolute top-0 left-1/2 -translate-x-1/2 sm:left-0 sm:translate-x-0 bg-transparent hover:bg-transparent rounded-full px-3 py-1 text-3sm font-medium text-body animate-fade-cycle opacity-0 flex items-center gap-1.5 pointer-events-none whitespace-nowrap'>
            <Rocket className='h-3 w-3 fill-secondary text-secondary' />
            700+ νέες υπηρεσίες
          </Badge>

          <Badge className='absolute top-0 left-1/2 -translate-x-1/2 sm:left-0 sm:translate-x-0 bg-transparent hover:bg-transparent rounded-full px-3 py-1 text-3sm font-medium text-body animate-fade-cycle opacity-0 [animation-delay:3s] flex items-center gap-1.5 pointer-events-none whitespace-nowrap'>
            <Star className='h-3 w-3 fill-secondary text-secondary' />
            Άριστοι επαγγελματίες 5*
          </Badge>

          <Badge className='absolute top-0 left-1/2 -translate-x-1/2 sm:left-0 sm:translate-x-0 bg-transparent hover:bg-transparent rounded-full px-3 py-1 text-3sm font-medium text-body animate-fade-cycle opacity-0 [animation-delay:6s] flex items-center gap-1.5 pointer-events-none whitespace-nowrap'>
            <Sparkles className='h-3 w-3 fill-secondary text-secondary' />
            400+ επαγγελματίες
          </Badge>
        </div>
      </div>

      {/* Main Heading - Critical for LCP */}
      <h1 className='text-base sm:text-xl font-bold leading-[1.2] text-dark mb-4 block font-sans opacity-100 visible'>
        Οι καλύτερες υπηρεσίες στην οθόνη σου.
      </h1>
    </div>
  );
}

// Search Bar Component using the new HomeSearch UI component
function HeroSearchBar() {
  return (
    <HomeSearch placeholder='Τι υπηρεσία ψάχνεις;' buttonText='Αναζήτηση' />
  );
}

// Popular Searches Component - Dynamic links to popular subcategories
function PopularSearches({ subcategories }: { subcategories: DatasetItem[] }) {
  // Show up to 6 popular subcategories
  const displaySubcategories = subcategories.slice(0, 6);

  // Fallback if no subcategories available
  if (displaySubcategories.length === 0) {
    return null;
  }

  return (
    <div className='text-center max-w-3xl lg:max-w-4xl mx-auto'>
      <p className='font-sans mb-4 text-gray-600 text-sm'>
        Δημοφιλείς Αναζητήσεις
      </p>

      <div className='flex flex-wrap gap-2 justify-center'>
        {displaySubcategories.map((sub) => (
          <NextLink href={`/ipiresies/${sub.slug}`} key={sub.id}>
            <Badge
              variant='outline'
              className='no-underline inline-block font-sans font-normal text-sm leading-6 py-2 px-5 rounded-full border border-gray-300 bg-white text-gray-700 transition-colors duration-200 ease-in-out hover:border-secondary hover:bg-secondary/5 cursor-pointer'
            >
              {sub.label}
            </Badge>
          </NextLink>
        ))}
      </div>
    </div>
  );
}

type HeroHomeProps = {
  popularSubcategories?: DatasetItem[];
};

export default function HeroHome({ popularSubcategories = [] }: HeroHomeProps) {
  return (
    <section className='overflow-visible bg-silver bg-gradient-to-t from-white to-silver contain-layout'>
      <div className='container mx-auto pt-4 md:pt-6 pb-6 sm:pb-7 md:pb-8 px-4 sm:px-6'>
        <div className='flex flex-col items-center'>
          <div className='max-w-6xl mx-auto text-center'>
            {/* Hero Content - Critical for LCP */}
            <StaticHeroContent />

            {/* Dark container with subtitle + search */}
            <div className='w-full max-w-3xl lg:max-w-4xl mx-auto mt-2 bg-dark rounded-3xl px-6 sm:px-10 py-8 sm:py-10'>
              {/* Subtitle */}
              <p className='text-base text-white font-medium mb-6 leading-relaxed font-sans'>
                Άμεση αναζήτηση υπηρεσιών από{' '}
                <span className='font-bold'>Επαγγελματίες</span> και{' '}
                <span className='font-bold'>Επιχειρήσεις</span>.
              </p>

              {/* Search Bar */}
              <Suspense
                fallback={
                  <div
                    className='h-14 flex items-center justify-center'
                    aria-label='Φόρτωση αναζήτησης'
                  >
                    <div
                      className='inline-block w-4 h-4 mr-2 border-2 border-white border-r-transparent rounded-full animate-spin'
                      role='status'
                      aria-hidden='true'
                    />
                    <span className='sr-only'>Φόρτωση...</span>
                  </div>
                }
              >
                <HeroSearchBar />
              </Suspense>
            </div>

            {/* Popular Searches - Deferred for better performance */}
            <div className='w-full mt-8'>
              <Suspense fallback={<div className='min-h-[60px]' />}>
                <PopularSearches subcategories={popularSubcategories} />
              </Suspense>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
