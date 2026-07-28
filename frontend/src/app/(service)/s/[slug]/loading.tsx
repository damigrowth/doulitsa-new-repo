import React from 'react';
import DynamicBreadcrumbSkeleton from '@/components/shared/dynamic-breadcrumb-skeleton';
import { Card, CardContent } from '@/components/ui/card';
import {
  ServiceMetaSkeleton,
  ServiceInfoSkeleton,
  ServiceAboutSkeleton,
  ServiceMediaSkeleton,
  ServiceOrderSkeleton,
  ServiceFAQSkeleton,
  ServiceContactSkeleton,
  ServiceRelatedSkeleton,
} from '@/components/service/skeletons';

/**
 * Loading skeleton for service page
 * Matches exact structure of src/app/(service)/s/[slug]/page.tsx
 */
export default function ServiceLoading() {
  return (
    <div className='py-20 bg-silver'>
      {/* Breadcrumb Navigation */}
      <DynamicBreadcrumbSkeleton />

      {/* Main Content */}
      <section className='pt-4'>
        <div className='container mx-auto px-4 lg:px-10'>
          <div className='relative grid grid-cols-1 lg:grid-cols-3 gap-28'>
            {/* Left Column - Main Content (2/3 width on desktop) */}
            <div className='lg:col-span-2 space-y-6'>
              {/* Service Header Card */}
              <Card className='shadow-sm border'>
                <CardContent className='p-6'>
                  <ServiceMetaSkeleton />
                  <ServiceInfoSkeleton />
                </CardContent>
              </Card>

              {/* Service About */}
              <ServiceAboutSkeleton />

              {/* Service Media (Gallery) */}
              <ServiceMediaSkeleton />

              {/* Service Order (Mobile only - shown in sidebar on desktop) */}
              <ServiceOrderSkeleton />

              {/* Service FAQ */}
              <ServiceFAQSkeleton />

              {/* Service Contact - Placeholder */}
            </div>

            {/* Right Column - Sidebar (1/3 width on desktop) */}
            <div className='space-y-6 sticky top-2 self-start'>
              {/* Service Order (Desktop only) */}
              <ServiceOrderSkeleton />

              {/* Service Contact */}
              <ServiceContactSkeleton />
            </div>
          </div>
        </div>
      </section>

      {/* Service Related */}
      <ServiceRelatedSkeleton />
    </div>
  );
}
