'use client';

import React from 'react';
import { useCarousel } from '@/components/ui/carousel';
import { cn } from '@/lib/utils';

interface CarouselPaginationProps {
  className?: string;
  slideCount: number;
  variant?: 'default' | 'light';
}

export function CarouselPagination({ className, slideCount, variant = 'default' }: CarouselPaginationProps) {
  const { api } = useCarousel();
  const [current, setCurrent] = React.useState(0);
  const [pageCount, setPageCount] = React.useState(0);

  React.useEffect(() => {
    if (!api) return;

    const onSelect = () => {
      setCurrent(api.selectedScrollSnap());
    };

    const updatePageCount = () => {
      // Get scroll snap count from API (works with slidesToScroll: 'auto')
      setPageCount(api.scrollSnapList().length);
    };

    api.on('select', onSelect);
    api.on('resize', updatePageCount);

    onSelect();
    updatePageCount();

    return () => {
      api.off('select', onSelect);
      api.off('resize', updatePageCount);
    };
  }, [api]);

  const scrollTo = React.useCallback((index: number) => {
    api?.scrollTo(index);
  }, [api]);

  if (pageCount <= 1) return null;

  return (
    <div className={cn('flex gap-1', className)}>
      {Array.from({ length: pageCount }).map((_, index) => (
        <button
          key={index}
          className={cn(
            'p-2.5 rounded-full transition-all duration-200',
            'flex items-center justify-center'
          )}
          onClick={() => scrollTo(index)}
          aria-label={`Μετάβαση στη σελίδα ${index + 1}`}
        >
          <span
            className={cn(
              'h-2 w-2 rounded-full transition-all duration-200',
              current === index
                ? variant === 'light'
                  ? 'bg-white w-6'
                  : 'bg-gray-800 w-6'
                : variant === 'light'
                  ? 'bg-white/40 hover:bg-white/60'
                  : 'bg-gray-300 hover:bg-gray-400'
            )}
          />
        </button>
      ))}
    </div>
  );
}