import { Skeleton } from '@/components/ui/skeleton';

/**
 * Skeleton loader for the onboarding form
 * Matches exact structure, proportions, and border radius of the actual form
 */
export function OnboardingFormSkeleton() {
  return (
    <div className='space-y-6'>
      {/* Profile Image Skeleton - Matches FormItem */}
      <div className='space-y-2'>
        <Skeleton className='h-[18px] w-28 rounded' /> {/* Label: text-sm */}
        <Skeleton className='h-4 w-96 rounded' /> {/* Description: text-sm */}
        <div className='flex items-center gap-4 mt-2'>
          <Skeleton className='w-[71px] h-[71px] rounded-lg border-2 border-gray-200' /> {/* Image preview: matches actual image dimensions */}
          <Skeleton className='h-10 w-40 rounded-md' /> {/* Upload button: rounded-md */}
        </div>
      </div>

      {/* Category Skeleton - LazyCombobox */}
      <div className='flex flex-col space-y-2'>
        <Skeleton className='h-5 w-24 rounded' /> {/* Label */}
        <Skeleton className='h-10 w-full rounded-md' /> {/* Combobox: rounded-md */}
      </div>

      {/* Bio Skeleton - Textarea */}
      <div className='space-y-2'>
        <Skeleton className='h-[18px] w-24 rounded' /> {/* Label: text-sm font-medium */}
        <Skeleton className='h-4 w-80 rounded' /> {/* Description: text-sm */}
        <Skeleton className='h-[120px] w-full rounded-md' /> {/* Textarea: min-h-[120px], rounded-md */}
        <Skeleton className='h-[14px] w-28 rounded' /> {/* Character count: text-sm */}
      </div>

      {/* Coverage Section Skeleton */}
      <div className='space-y-4'>
        <div className='border-b pb-2'>
          <Skeleton className='h-6 w-64 rounded' /> {/* Section heading: text-lg font-semibold */}
        </div>
        <div className='space-y-3'>
          <Skeleton className='h-4 w-48 rounded' /> {/* "Προσφέρω τις υπηρεσίες:" */}
          <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
            <div className='flex items-center space-x-2'>
              <Skeleton className='h-4 w-4 rounded-sm' /> {/* Checkbox: rounded-sm */}
              <Skeleton className='h-[14px] w-16 rounded' /> {/* "Online" */}
            </div>
            <div className='flex items-center space-x-2'>
              <Skeleton className='h-4 w-4 rounded-sm' />
              <Skeleton className='h-[14px] w-32 rounded' /> {/* "Στον χώρο μου" */}
            </div>
            <div className='flex items-center space-x-2'>
              <Skeleton className='h-4 w-4 rounded-sm' />
              <Skeleton className='h-[14px] w-44 rounded' /> {/* "Στον χώρο του πελάτη" */}
            </div>
          </div>
        </div>
      </div>

      {/* Portfolio Skeleton */}
      <div className='space-y-2'>
        <Skeleton className='h-[18px] w-32 rounded' /> {/* Label: text-sm font-medium */}
        <Skeleton className='h-4 w-72 rounded' /> {/* Description: text-sm */}
        <Skeleton className='h-32 w-full rounded-md' /> {/* Upload area: rounded-md */}
      </div>

      {/* Submit Button Skeleton */}
      <div className='pt-4 flex justify-center'>
        <Skeleton className='h-11 w-2/3 rounded-md' /> {/* Button: h-11 default, rounded-md */}
      </div>
    </div>
  );
}
