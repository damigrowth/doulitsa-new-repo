import React from 'react';
import ServiceCard from '@/components/shared/service-card';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import { CarouselPagination } from '@/components/ui/carousel-pagination';
import { ServiceCardData } from '@/lib/types';

interface ServicesCarouselProps {
  services: ServiceCardData[];
  activeCategory?: string;
}

export function ServicesCarousel({
  services,
  activeCategory = 'all',
}: ServicesCarouselProps) {

  // Filter services based on active category (if provided)
  const displayServices = services;

  if (displayServices.length === 0) {
    return (
      <div className='text-center py-8'>
        <p className='text-gray-500'>
          Δεν βρέθηκαν υπηρεσίες σε αυτήν την κατηγορία.
        </p>
      </div>
    );
  }

  return (
    <div className='relative'>
      <Carousel
        opts={{
          align: 'start',
          slidesToScroll: 'auto',
        }}
        className='w-full'
      >
        <CarouselContent className='-ml-0 sm:-ml-2'>
          {displayServices.map((service) => (
            <CarouselItem
              key={service.id}
              className='pl-2 sm:pl-4 basis-full sm:basis-1/2 lg:basis-1/4 cursor-pointer'
            >
              <ServiceCard service={service} />
            </CarouselItem>
          ))}
        </CarouselContent>

        {/* Navigation Controls - always visible with default positioning */}
        {displayServices.length > 1 && (
          <>
            <CarouselPrevious className='hidden sm:flex !opacity-100 !-translate-x-12 !rounded-full !bg-white/90 !backdrop-blur-sm !border !border-gray-200/50 !text-gray-800 hover:!bg-white hover:!text-gray-900 hover:!border-gray-300 !shadow-lg hover:!shadow-xl' />
            <CarouselNext className='hidden sm:flex !opacity-100 !translate-x-12 !rounded-full !bg-white/90 !backdrop-blur-sm !border !border-gray-200/50 !text-gray-800 hover:!bg-white hover:!text-gray-900 hover:!border-gray-300 !shadow-lg hover:!shadow-xl' />
          </>
        )}

        {/* Pagination Dots */}
        {displayServices.length > 1 && (
          <CarouselPagination
            slideCount={displayServices.length}
            className='mt-4 sm:mt-6 justify-center'
          />
        )}
      </Carousel>
    </div>
  );
}
