import { Badge } from '@/components/ui/badge';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import type { SubdivisionItem } from '@/actions/services/get-categories';
import { NextLink } from '@/components';

interface SubdivisionsCarouselProps {
  subdivisions: SubdivisionItem[];
  hideTitle?: boolean;
  gradientColor?: 'white' | 'silver';
  title?: string;
}

export function SubdivisionsCarousel({
  subdivisions,
  hideTitle = false,
  gradientColor = 'white',
  title = 'Πιο δημοφιλείς εργασίες',
}: SubdivisionsCarouselProps) {
  if (subdivisions.length === 0) {
    return null;
  }

  const gradientClass =
    gradientColor === 'silver'
      ? 'from-silver via-silver/60'
      : 'from-white via-white/60';

  return (
    <section>
      {!hideTitle && (
        <div className='mb-6'>
          <h2 className='text-2xl font-bold text-gray-900 mb-2'>{title}</h2>
        </div>
      )}

      <div className='relative overflow-x-clip'>
        <Carousel
          opts={{
            align: 'start',
            slidesToScroll: 1,
          }}
          className='w-full'
        >
          <CarouselContent className='-ml-0 sm:-ml-2'>
            {subdivisions.map((subdivision, idx) => (
              <CarouselItem
                key={subdivision.id ?? subdivision.slug ?? idx}
                className='pl-2 md:pl-4 basis-auto'
              >
                <NextLink href={subdivision.href}>
                  <Badge
                    variant='outline'
                    className='no-underline inline-block font-sans font-normal text-sm leading-6 py-2 px-5 rounded-full border border-gray-300 bg-white text-gray-700 transition-colors duration-200 ease-in-out hover:border-secondary hover:bg-secondary/5 cursor-pointer whitespace-nowrap'
                  >
                    {subdivision.label}
                    {/* <span className='ml-2 text-xs opacity-70'>
                      ({subdivision.count})
                    </span> */}
                  </Badge>
                </NextLink>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className='hidden md:flex' />
          <CarouselNext className='hidden md:flex' />
        </Carousel>
        {/* Fade gradient */}
        <div
          className={`absolute inset-y-0 right-0 w-24 bg-gradient-to-l ${gradientClass} to-transparent pointer-events-none`}
        />
      </div>
    </section>
  );
}
