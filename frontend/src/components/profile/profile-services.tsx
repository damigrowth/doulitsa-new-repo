'use client';

import React, { useState } from 'react';
import { ServiceMediaCard } from '../shared/service-media-card';
import { Button } from '@/components/ui/button';
import type { ServiceCardData } from '@/lib/types';

interface ProfileServicesProps {
  services: ServiceCardData[];
  profileUsername: string;
}

export default function ProfileServices({
  services,
  profileUsername,
}: ProfileServicesProps) {
  const [visibleCount, setVisibleCount] = useState(3);

  if (!services || services.length === 0) {
    return null;
  }

  const hasMore = visibleCount < services.length;
  const visibleServices = services.slice(0, visibleCount);

  const handleLoadMore = () => {
    setVisibleCount((prev) => Math.min(prev + 3, services.length));
  };

  return (
    <section id='services' className='py-5 scroll-mt-2'>
      <h4 className='font-semibold text-lg text-foreground mb-5'>
        Υπηρεσίες ({services.length})
      </h4>

      <div className='space-y-6'>
        {visibleServices.map((service) => (
          <ServiceMediaCard
            key={service.id}
            service={service}
          />
        ))}
      </div>

      {hasMore && (
        <div className='mt-6 text-center'>
          <Button onClick={handleLoadMore} variant='outline' size='lg'>
            Περισσότερες Υπηρεσίες
          </Button>
        </div>
      )}
    </section>
  );
}
