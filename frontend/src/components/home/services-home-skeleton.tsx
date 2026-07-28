import { Skeleton } from '@/components/ui/skeleton';

export function ServicesHomeSkeleton() {
  return (
    <section className='bg-silver overflow-hidden'>
      <div className='container mx-auto px-4 sm:px-6 py-8 sm:py-12 md:py-16'>
        {/* Header Section Skeleton */}
        <div className='flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 sm:gap-6 md:gap-8 mb-6 sm:mb-8 md:mb-12'>
          {/* Left Side - Title & Description Skeleton */}
          <div className='flex-1 lg:max-w-2xl space-y-2'>
            <Skeleton className='h-8 w-64' />
            <Skeleton className='h-5 w-96' />
          </div>

          {/* Right Side - Category Tabs Skeleton */}
          <div className='w-full lg:w-2/3 flex gap-2 justify-start lg:justify-end'>
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className='h-10 w-24 rounded-full' />
            ))}
          </div>
        </div>

        {/* Services Carousel Skeleton */}
        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4'>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className='space-y-4'>
              {/* Image Skeleton */}
              <Skeleton className='aspect-video w-full rounded-lg' />

              {/* Content Skeleton */}
              <div className='space-y-3'>
                <Skeleton className='h-4 w-24' />
                <Skeleton className='h-6 w-full' />
                <Skeleton className='h-4 w-32' />
              </div>

              {/* Footer Skeleton */}
              <div className='flex justify-between items-center pt-3 border-t'>
                <div className='flex items-center gap-2'>
                  <Skeleton className='h-6 w-6 rounded-full' />
                  <Skeleton className='h-4 w-20' />
                </div>
                <Skeleton className='h-4 w-16' />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
