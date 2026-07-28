'use client';

import dynamic from 'next/dynamic';
import { ServicesHomeSkeleton } from './services-home-skeleton';
import type { ServiceCardData } from '@/lib/types/components';

// Lazy load the services section wrapper
const ServicesHomeWrapper = dynamic(
  () =>
    import('./services-home-wrapper').then((mod) => ({
      default: mod.ServicesHomeWrapper,
    })),
  {
    loading: () => <ServicesHomeSkeleton />,
    ssr: false, // Below-fold content doesn't need SSR
  },
);

interface ServicesHomeLazyProps {
  mainCategories: Array<{
    id: string;
    label: string;
    slug: string;
  }>;
  servicesByCategory: Record<string, ServiceCardData[]>;
}

export function ServicesHomeLazy({
  mainCategories,
  servicesByCategory,
}: ServicesHomeLazyProps) {
  return (
    <ServicesHomeWrapper
      mainCategories={mainCategories}
      servicesByCategory={servicesByCategory}
    />
  );
}
