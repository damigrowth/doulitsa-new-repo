'use client';

import { useMemo } from 'react';
import ServicesHome from './home-services';
import { ServiceCardData } from '@/lib/types';

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

interface ServicesHomeWrapperProps {
  mainCategories: Array<{
    id: string;
    label: string;
    slug: string;
  }>;
  servicesByCategory: Record<string, ServiceCardData[]>;
}

export function ServicesHomeWrapper({
  mainCategories,
  servicesByCategory,
}: ServicesHomeWrapperProps) {
  // Shuffle services client-side so each visit gets a fresh order
  const shuffledServicesByCategory = useMemo(() => {
    const shuffled: Record<string, ServiceCardData[]> = {};
    for (const [key, services] of Object.entries(servicesByCategory)) {
      shuffled[key] = shuffleArray(services);
    }
    return shuffled;
  }, [servicesByCategory]);

  return (
    <ServicesHome
      mainCategories={mainCategories}
      servicesByCategory={shuffledServicesByCategory}
    />
  );
}
