'use client';

import React from 'react';
import Image from 'next/image';
import { Quote, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import { CarouselPagination } from '@/components/ui/carousel-pagination';
import { testimonials } from '@/constants/datasets/data';
import { getOptimizedImageUrl } from '@/lib/utils/cloudinary';

type TestimonialData = {
  id: string;
  title: string;
  comment: string;
  name: string;
  category: string;
  image: string;
  active?: boolean;
};

type Props = {
  testimonials?: TestimonialData[];
};

function TestimonialCard({ testimonial }: { testimonial: TestimonialData }) {
  // Optimize testimonial avatar image (60x60px display)
  const optimizedAvatar = getOptimizedImageUrl(testimonial.image, 'thumbnail') || testimonial.image;

  return (
    <div className='rounded-2xl bg-white px-10 py-11 pb-8 relative'>
      <div className='border-b border-border mb-5 pb-8'>
        <h3 className='text-secondary mb-6 text-lg font-bold'>
          {testimonial.title}
        </h3>
        <p className='text-primary text-lg leading-8 font-medium'>
          {testimonial.comment}
        </p>
      </div>
      <div className='flex items-center'>
        <div className='flex-shrink-0'>
          <Image
            height={60}
            width={60}
            className='h-15 w-15 object-cover rounded-full'
            src={optimizedAvatar}
            alt='avatar'
            loading='lazy'
          />
        </div>
        <div className='flex-grow ml-3'>
          <p className='mb-0 font-semibold'>{testimonial.name}</p>
          <p className='text-sm mb-0 text-gray-600'>{testimonial.category}</p>
        </div>
      </div>
    </div>
  );
}

function StatItem({
  value,
  suffix = '',
  description,
}: {
  value: string | number;
  suffix?: string;
  description: string;
}) {
  return (
    <div className='transition-all duration-400 ease-in-out px-4'>
      <div className='flex items-baseline mb-2'>
        <span className='text-dark font-bold text-xl sm:text-2xl leading-8 sm:leading-10 font-sans'>
          {value}
        </span>
        {suffix && (
          <span className='text-dark font-bold text-xl sm:text-2xl leading-8 sm:leading-10 font-sans ml-1'>
            {suffix}
          </span>
        )}
      </div>
      <p className='mb-0 text-sm leading-relaxed'>{description}</p>
    </div>
  );
}

export default function TestimonialsHome({
  testimonials: testimonialsProps,
}: Props) {
  // Use provided testimonials or fallback to default data
  const testimonialsItems = testimonialsProps || testimonials;

  return (
    <section className='relative bg-gradient-to-b from-bluey to-silver'>
      <div className='container mx-auto px-4 sm:px-6 py-8 sm:py-12 md:py-16 lg:pt-32'>
        <div className='flex flex-wrap items-center'>
          {/* Stats Section */}
          <div className='w-full md:w-1/2 lg:w-2/3 md:mb-0'>
            <div className='mb-4 sm:mb-6 md:mb-8'>
              <h2 className='text-xl lg:text-2xl font-bold mb-4 text-dark'>
                Βρες τους πιο αξιόλογους επαγγελματίες
              </h2>
              <p className='text-gray-700 leading-relaxed'>
                Η Doulitsa επιβραβεύει και ξεχωρίζει τους καλύτερους
                επαγγελματίες, γιατί θέλουμε να μένουν όλοι ικανοποιημένοι.
              </p>
            </div>

            <div className='flex flex-wrap -mx-2 sm:-mx-4'>
              <div className='w-full sm:w-1/2 lg:w-1/3 mb-6 px-2 sm:px-4'>
                <StatItem
                  value='4.9/5'
                  description='Οι top επαγγελματίες έχουν λάβει τις καλύτερες αξιολογήσεις'
                />
              </div>

              <div className='w-full sm:w-1/2 lg:w-1/3 mb-6 px-2 sm:px-4'>
                <StatItem
                  value='99'
                  suffix='% εγγύηση'
                  description='Επιβεβαιώνουμε ότι οι επαγγελματίες είναι πραγματικοί, ώστε να μην πέσετε θύμα εξαπάτησης'
                />
              </div>

              <div className='w-full sm:w-1/2 lg:w-1/3 mb-6 px-2 sm:px-4'>
                <div className='transition-all duration-400 ease-in-out px-4'>
                  <div className='mb-4'>
                    <h3 className='text-dark font-bold text-2xl leading-10 mb-2'>
                      Μας προτείνουν
                    </h3>
                    <p className='mb-0 text-sm leading-relaxed'>
                      Έχουμε συνεργασίες με εταιρείες, οι οποίες μας επιλέγουν
                      από τον 1ο χρόνο λειτουργίας μας.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Testimonials Carousel Section */}
          <div className='w-full md:w-1/2 lg:w-1/3'>
            <div className='mb-4'>
              <Carousel className='w-full'>
                <CarouselContent>
                  {testimonialsItems.map((testimonial, index) => (
                    <CarouselItem key={index}>
                      <TestimonialCard testimonial={testimonial} />
                    </CarouselItem>
                  ))}
                </CarouselContent>

                {/* Pagination */}
                <div className='flex justify-center mt-4 sm:mt-6'>
                  <CarouselPagination
                    slideCount={testimonialsItems.length}
                    className='justify-center'
                  />
                </div>
              </Carousel>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
