import React from 'react';
import DynamicBreadcrumbSkeleton from '@/components/shared/dynamic-breadcrumb-skeleton';
import {
  ProfileMetaSkeleton,
  ProfileMetricsSkeleton,
  ProfileBioSkeleton,
  ProfileFeaturesSkeleton,
  ProfilePortfolioSkeleton,
  ProfileServicesSkeleton,
  ProfileTermsSkeleton,
  ProfileInfoSkeleton,
} from '@/components/profile/skeletons';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Loading state for profile page
 * Matches exact structure and styling of the actual profile page
 */
export default function ProfileLoading() {
  return (
    <div className='my-20'>
      {/* Breadcrumb Navigation */}
      <DynamicBreadcrumbSkeleton />

      {/* Profile Content */}
      <section className='pt-4 pb-20 bg-white'>
        <div className='container mx-auto px-4 lg:px-10'>
          <div className='relative grid grid-cols-1 lg:grid-cols-3 gap-28'>
            {/* Main Content */}
            <div className='lg:col-span-2 space-y-12'>
              {/* Profile Header */}
              <ProfileMetaSkeleton />

              {/* Profile Metrics */}
              <ProfileMetricsSkeleton />

              {/* Profile Bio */}
              <ProfileBioSkeleton />

              {/* Profile Features */}
              <ProfileFeaturesSkeleton />

              {/* Profile Portfolio */}
              <ProfilePortfolioSkeleton />

              {/* Profile Services */}
              <ProfileServicesSkeleton />

              {/* Profile Terms */}
              <ProfileTermsSkeleton />

              {/* Report Profile Button Skeleton */}
              <div className='pt-4'>
                <Skeleton className='h-10 w-48 rounded-lg' />
              </div>

              {/* Mobile Sidebar */}
              <div className='lg:hidden mb-8'>
                <div className='space-y-6'>
                  <ProfileInfoSkeleton />
                </div>
              </div>
            </div>

            {/* Desktop Sidebar - Hidden on mobile */}
            <div className='hidden lg:block space-y-6 sticky top-2 self-start'>
              <ProfileInfoSkeleton />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
