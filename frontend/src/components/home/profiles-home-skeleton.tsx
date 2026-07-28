import { Skeleton } from '@/components/ui/skeleton';

export function ProfilesHomeSkeleton() {
  return (
    <section className='py-8 sm:py-12 md:py-16 bg-dark overflow-hidden'>
      <div className='container mx-auto px-4 sm:px-6'>
        {/* Header Section Skeleton */}
        <div className='flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 sm:gap-6 md:gap-8 mb-6 sm:mb-8 md:mb-12'>
          <div className='flex-1 lg:max-w-2xl space-y-2'>
            <Skeleton className='h-8 w-80 bg-gray-700' />
            <Skeleton className='h-5 w-96 bg-gray-700' />
          </div>
          <Skeleton className='h-10 w-48 bg-gray-700' />
        </div>

        {/* Profiles Carousel Skeleton */}
        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4'>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className='bg-white rounded-xl border border-gray-200 overflow-hidden'>
              {/* Avatar Section - matching bg area with left-aligned avatar */}
              <div className='bg-gray-50 min-h-28 pl-5 py-4 flex items-center'>
                <Skeleton className='h-32 w-32 rounded-2xl' />
              </div>

              {/* Content Section */}
              <div className='px-6 py-4 pb-6 space-y-3'>
                {/* Name + badges */}
                <Skeleton className='h-6 w-40' />

                {/* Subcategory + tagline */}
                <Skeleton className='h-4 w-48' />

                {/* Rating */}
                <Skeleton className='h-4 w-28' />

                {/* Coverage */}
                <Skeleton className='h-4 w-36' />

                {/* Skills section with border-t */}
                <div className='border-t border-gray-200 pt-3 flex items-center gap-2'>
                  <Skeleton className='h-6 w-20 rounded-full' />
                  <Skeleton className='h-6 w-16 rounded-full' />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
